import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, PackageSearch, Loader2, Search } from 'lucide-react';
import { masterDataService } from '../../../api/packing/masterDataService';
import { workOrderService, WoPriority } from '../../../api/packing/workOrderService';
import { inventoryService } from '../inventory/services/inventoryService';
import procurementService from '../vsms/services/procurementService';
import { Pagination } from '../../../components/ui';

export interface SourceInventoryRow {
  id: string;
  sku?: string;
  product: string;
  batch: string;
  grn: string;
  availableQty: number;
  uom: string;
  category: string;
  productType?: string;
}

export interface SkuOption {
  name: string;
  packSizeText: string;
  packSizeKg: number;
  sourceProductId?: string;
  sourceProductName?: string;
}

export interface OutputSkuRow {
  id: string;
  skuName: string;
  packSizeText: string;
  packSizeKg: number;
  plannedUnits: number | '';
  sourceProductId?: string;
  sourceProductName?: string;
}

interface CreateWorkOrderFlowProps {
  onClose: () => void;
  onSuccess?: () => void;
  sourceInventoryData?: SourceInventoryRow[];
  skuOptionsData?: SkuOption[];
}

function parseUnitAndMeasurement(item: any, defaultUnit: string = 'KG') {
  let rawMeas = parseFloat(item.measurement || item.weight || '') || 0;
  let rawUnit = item.uom?.abbreviation || item.uom?.name || item.unit || '';

  const textToSearch = `${item.sku || ''} ${item.variantName || ''} ${item.name || ''}`.toUpperCase();

  // Try parsing measurement and unit from item name / variant (e.g. "Sugar 1kg", "500 gm", "1 L")
  const match = textToSearch.match(/(\d+(?:\.\d+)?)\s*(KG|KILOGRAM|GM|GRAM|\bG\b|ML|LITRE|LTR|\bL\b|PCS|PACKET|PIECE)/i);
  if (match) {
    if (!rawMeas) rawMeas = parseFloat(match[1]);
    const matchedUnit = match[2].toUpperCase();
    if (!rawUnit || rawUnit === 'P' || rawUnit === 'PCS' || rawUnit === 'PACKET' || /^[0-9a-f-]{36}$/i.test(String(rawUnit).trim()) || /^\d+$/.test(String(rawUnit).trim())) {
      if (matchedUnit === 'KILOGRAM' || matchedUnit === 'KG') rawUnit = 'KG';
      else if (matchedUnit === 'GRAM' || matchedUnit === 'GM' || matchedUnit === 'G') rawUnit = 'GM';
      else if (matchedUnit === 'MILLILITRE' || matchedUnit === 'ML') rawUnit = 'ML';
      else if (matchedUnit === 'LITRE' || matchedUnit === 'LTR' || matchedUnit === 'L') rawUnit = 'L';
      else if (matchedUnit === 'PACKET' || matchedUnit === 'PCS' || matchedUnit === 'PIECE') rawUnit = 'PCS';
    }
  }

  if (!rawMeas) rawMeas = 1;
  if (!rawUnit || rawUnit === 'P' || rawUnit === 'PCS' || rawUnit === 'PACKET' || /^[0-9a-f-]{36}$/i.test(String(rawUnit).trim()) || /^\d+$/.test(String(rawUnit).trim())) {
    if (textToSearch.includes('KG') || textToSearch.includes('KILOGRAM')) {
      rawUnit = 'KG';
    } else if (textToSearch.includes('GRAM') || textToSearch.includes(' GM') || textToSearch.includes(' G')) {
      rawUnit = 'GM';
    } else if (textToSearch.includes('MILLILITRE') || textToSearch.includes(' ML')) {
      rawUnit = 'ML';
    } else if (textToSearch.includes('LITRE') || textToSearch.includes(' LTR')) {
      rawUnit = 'L';
    } else {
      rawUnit = defaultUnit || 'KG';
    }
  }

  const unitUpper = String(rawUnit).toUpperCase();
  let packSizeKg = rawMeas;
  let displayUnit = rawUnit;

  if (unitUpper === 'KG' || unitUpper === 'KILOGRAM' || unitUpper === 'KILOGRAMS' || unitUpper.includes('KILOGRAM') || unitUpper.includes('KG')) {
    displayUnit = 'KG';
    packSizeKg = rawMeas;
  } else if (unitUpper === 'G' || unitUpper === 'GM' || unitUpper === 'GRAM' || unitUpper === 'GRAMS' || unitUpper.includes('GRAM')) {
    displayUnit = 'GM';
    packSizeKg = rawMeas / 1000;
  } else if (unitUpper === 'ML' || unitUpper.includes('MILLILITRE') || unitUpper.includes('MILLILITER')) {
    displayUnit = 'ML';
    packSizeKg = rawMeas / 1000;
  } else if (unitUpper === 'L' || unitUpper === 'LTR' || unitUpper.includes('LITRE') || unitUpper.includes('LITER')) {
    displayUnit = 'L';
    packSizeKg = rawMeas;
  }

  return {
    measurement: rawMeas,
    unit: displayUnit,
    packSizeKg,
  };
}

export const CreateWorkOrderFlow: React.FC<CreateWorkOrderFlowProps> = ({
  onClose,
  onSuccess,
  sourceInventoryData,
  skuOptionsData = [],
}) => {
  const [activeStep, setActiveStep] = useState<number>(1);
  const [liveSourceData, setLiveSourceData] = useState<SourceInventoryRow[]>(sourceInventoryData || []);
  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(!sourceInventoryData);
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [remarks, setRemarks] = useState<string>('');
  const [priority, setPriority] = useState<WoPriority>('MEDIUM');
  const [fetchedCatalogProducts, setFetchedCatalogProducts] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Pagination & Search state for Eligible Source Inventory table
  const [sourceSearchTerm, setSourceSearchTerm] = useState<string>('');
  const [sourceCurrentPage, setSourceCurrentPage] = useState<number>(1);
  const [sourceItemsPerPage, setSourceItemsPerPage] = useState<number>(10);

  useEffect(() => {
    if (sourceInventoryData) {
      setLiveSourceData(sourceInventoryData);
      return;
    }

    const fetchEligibleInventory = async () => {
      setIsLoadingProducts(true);
      try {
        let grnMap: Record<string, number> = {};
        let resolvedUnitMap: Record<string, string> = {};

        try {
          const [grnRes, unconfiguredRes] = await Promise.allSettled([
            inventoryService.getProcurementGRNs(),
            procurementService.getUnconfiguredGRNItems({ includeConfigured: true })
          ]);

          const list = grnRes.status === 'fulfilled' ? (grnRes.value.data?.data || grnRes.value.data || grnRes.value || []) : [];
          list.forEach((grn: any) => {
            if (grn.items && Array.isArray(grn.items)) {
              grn.items.forEach((item: any) => {
                const baseProdId = item.product?.id || item.product?.productId;
                const rawProdId = item.productId;
                const recQty = Number(item.receivedQuantity ?? item.receivedQty ?? item.quantity ?? 0);
                const unitVal = item.uom || item.unit || item.resolvedUnit;

                const targetIds = new Set<string>();
                if (baseProdId) targetIds.add(baseProdId);
                if (rawProdId) {
                  targetIds.add(rawProdId);
                  if (typeof rawProdId === 'string' && rawProdId.includes('_')) {
                    targetIds.add(rawProdId.split('_')[0]);
                  }
                }
                targetIds.forEach(pid => {
                  grnMap[pid] = (grnMap[pid] || 0) + recQty;
                  if (unitVal && (!resolvedUnitMap[pid] || resolvedUnitMap[pid] === 'Units')) {
                    resolvedUnitMap[pid] = unitVal;
                  }
                });
              });
            }
          });

          if (unconfiguredRes.status === 'fulfilled') {
            const unconfData = unconfiguredRes.value.data?.data || unconfiguredRes.value.data || unconfiguredRes.value || [];
            if (Array.isArray(unconfData) && unconfData.length > 0) {
              grnMap = {};
              unconfData.forEach((uItem: any) => {
                const baseProdId = uItem.product?.id || uItem.product?.productId;
                const rawProdId = uItem.productId;
                const recQty = Number(uItem.receivedQty) || 0;
                const unitVal = uItem.resolvedUnit || uItem.uom || uItem.unit;

                const targetIds = new Set<string>();
                if (baseProdId) targetIds.add(baseProdId);
                if (rawProdId) {
                  targetIds.add(rawProdId);
                  if (typeof rawProdId === 'string' && rawProdId.includes('_')) {
                    targetIds.add(rawProdId.split('_')[0]);
                  }
                }
                targetIds.forEach(pid => {
                  grnMap[pid] = (grnMap[pid] || 0) + recQty;
                  if (unitVal && (!resolvedUnitMap[pid] || resolvedUnitMap[pid] === 'Units')) {
                    resolvedUnitMap[pid] = unitVal;
                  }
                });
              });
            }
          }
        } catch (grnErr) {
          console.error('Error fetching procurement GRNs in CreateWorkOrderFlow:', grnErr);
        }

        const products = await masterDataService.getProducts('inventoryType=PRODUCTION');
        const mappedRows: SourceInventoryRow[] = (products || []).map((p: any) => {
          const baseId = p.id ? p.id.split('_')[0] : p.id;
          const procUnit = resolvedUnitMap[baseId] || resolvedUnitMap[p.id];
          let uomVal = procUnit || p.uom?.abbreviation || p.uom?.name || p.unit || '';
          const textToSearch = `${p.sku || ''} ${p.name || ''} ${p.category?.name || ''}`.toUpperCase();

          if (!uomVal || uomVal === 'P' || uomVal === 'PCS' || uomVal === 'PACKET' || /^[0-9a-f-]{36}$/i.test(String(uomVal).trim()) || /^\d+$/.test(String(uomVal).trim())) {
            if (textToSearch.includes('KG') || textToSearch.includes('KILOGRAM')) {
              uomVal = 'KG';
            } else if (textToSearch.includes('GM') || textToSearch.includes('GRAM')) {
              uomVal = 'GM';
            } else if (textToSearch.includes('ML') || textToSearch.includes('MILLILITRE')) {
              uomVal = 'ML';
            } else if (textToSearch.includes('LITRE') || textToSearch.includes(' LTR')) {
              uomVal = 'L';
            } else if (!uomVal) {
              uomVal = 'KG';
            }
          }

          const totalProcuredQty = grnMap[baseId] || grnMap[p.id] || 0;
          const inProdQty = Number(p.inProductionQty || p.productionStock?.inProductionQty || 0);
          const resolvedQty = inProdQty > 0 ? inProdQty : (p.receivedQty ?? p.acceptedQty ?? p.availableStock ?? totalProcuredQty);

          return {
            id: p.id || p.sku || `INV-${Math.random().toString(36).substring(2, 7)}`,
            sku: (p.sku && String(p.sku).trim() && !/^[0-9a-f-]{36}$/i.test(String(p.sku).trim()) && !/-\d+-(GRAMS|KG|KILOGRAMS|GM|G|ML|L|PACKET|PCS)/i.test(String(p.sku).trim())) ? String(p.sku).trim() : '—',
            product: p.name || 'Unnamed Product',
            batch: p.batchNo || p.batchNumber || p.batches?.[0]?.batchNumber || p.inwardBatchNo || p.batchCode || (p.id ? `BAT-${p.id.slice(-5).toUpperCase()}` : 'BAT-001'),
            grn: p.grnNumber || 'GRN-STORE',
            availableQty: resolvedQty,
            uom: uomVal,
            category: p.category?.name || p.categoryName || 'General',
            productType: p.productType || p.type || 'RAW_MATERIAL',
          };
        });
        setLiveSourceData(mappedRows);
      } catch (err) {
        console.error('Error fetching production raw inventory:', err);
      } finally {
        setIsLoadingProducts(false);
      }
    };

    const fetchCatalogProducts = async () => {
      try {
        const catalog = await masterDataService.getProducts();
        setFetchedCatalogProducts(catalog || []);
      } catch (err) {
        console.error('Error fetching catalog products from Manage Products:', err);
      }
    };

    fetchEligibleInventory();
    fetchCatalogProducts();
  }, [sourceInventoryData]);

  // Source inventory list with search filter and pagination
  const filteredSourceList = React.useMemo(() => {
    if (!sourceSearchTerm.trim()) return liveSourceData;
    const term = sourceSearchTerm.toLowerCase().trim();
    return liveSourceData.filter(
      (item) =>
        (item.product && item.product.toLowerCase().includes(term)) ||
        (item.sku && item.sku.toLowerCase().includes(term)) ||
        (item.category && item.category.toLowerCase().includes(term)) ||
        (item.batch && item.batch.toLowerCase().includes(term)) ||
        (item.grn && item.grn.toLowerCase().includes(term))
    );
  }, [liveSourceData, sourceSearchTerm]);

  const sourceTotalPages = Math.ceil(filteredSourceList.length / sourceItemsPerPage) || 1;
  const paginatedSourceList = React.useMemo(() => {
    const start = (sourceCurrentPage - 1) * sourceItemsPerPage;
    return filteredSourceList.slice(start, start + sourceItemsPerPage);
  }, [filteredSourceList, sourceCurrentPage, sourceItemsPerPage]);

  const sourcePagination = {
    page: sourceCurrentPage,
    limit: sourceItemsPerPage,
    total: filteredSourceList.length,
    totalPages: sourceTotalPages,
    hasNext: sourceCurrentPage < sourceTotalPages,
    hasPrev: sourceCurrentPage > 1,
  };

  const selectedItems = liveSourceData.filter((i) => selectedSourceIds.includes(i.id));
  const primarySelectedItem = selectedItems[0];
  const sourceUom = primarySelectedItem?.uom || 'KG';

  // Group quantities by UOM to avoid adding mismatched UOMs (e.g., 18 KG + 1163 Packets)
  const qtyByUom = React.useMemo(() => {
    const map: Record<string, number> = {};
    selectedItems.forEach((item) => {
      const uom = (item.uom || 'KG').toUpperCase();
      map[uom] = (map[uom] || 0) + (Number(item.availableQty) || 0);
    });
    return map;
  }, [selectedItems]);

  // Formatted source quantity string (e.g. "18 KG, 1163 P" or "38 KG")
  const sourceQtyDisplay = React.useMemo(() => {
    const entries = Object.entries(qtyByUom);
    if (entries.length === 0) return '0 KG';
    return entries.map(([uom, qty]) => `${qty} ${uom}`).join(', ');
  }, [qtyByUom]);

  const toggleSourceSelection = (id: string) => {
    setSelectedSourceIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const isAllSelected =
    filteredSourceList.length > 0 &&
    filteredSourceList.every((item) => selectedSourceIds.includes(item.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      const filteredIds = new Set(filteredSourceList.map((i) => i.id));
      setSelectedSourceIds((prev) => prev.filter((id) => !filteredIds.has(id)));
    } else {
      const allIds = filteredSourceList.map((item) => item.id);
      setSelectedSourceIds((prev) => Array.from(new Set([...prev, ...allIds])));
    }
  };

  // Dynamic SKU Options fetched from Manage Products API for all selected products
  const activeSkuOptions: SkuOption[] = React.useMemo(() => {
    if (skuOptionsData && skuOptionsData.length > 0) return skuOptionsData;
    if (selectedItems.length === 0) return [];

    const options: SkuOption[] = [];

    selectedItems.forEach((sItem) => {
      const selectedName = sItem.product?.trim() || '';
      const nameLower = selectedName.toLowerCase();
      const keywords = nameLower.split(' ').filter((k) => k.length > 2);
      const itemUom = sItem.uom || 'KG';

      // Filter catalog products from Manage Products matching selected product name or keywords
      const matchingProducts = fetchedCatalogProducts.filter((p: any) => {
        const pName = (p.name || '').toLowerCase();
        const pSku = (p.sku || '').toLowerCase();
        return (
          pName.includes(nameLower) ||
          (keywords.length > 0 && keywords.every((k) => pName.includes(k) || pSku.includes(k)))
        );
      });

      if (matchingProducts.length > 0) {
        matchingProducts.forEach((p: any) => {
          const parsedMain = parseUnitAndMeasurement(p, itemUom);

          const mainOptionName = p.name.toLowerCase().includes(String(parsedMain.measurement))
            ? p.name
            : `${p.name} ${parsedMain.measurement} ${parsedMain.unit}`;

          options.push({
            name: mainOptionName,
            packSizeText: `${parsedMain.measurement} ${parsedMain.unit}`,
            packSizeKg: parsedMain.packSizeKg,
            sourceProductId: sItem.id,
            sourceProductName: sItem.product,
          });

          if (Array.isArray(p.variants) && p.variants.length > 0) {
            p.variants.forEach((v: any) => {
              const parsedVar = parseUnitAndMeasurement(v, parsedMain.unit);
              const varLabel = v.variantName && v.variantName !== p.name
                ? v.variantName
                : `${parsedVar.measurement} ${parsedVar.unit}`;

              const variantOptionName = p.name.toLowerCase().includes(varLabel.toLowerCase())
                ? `${p.name} ${varLabel}`
                : `${p.name} ${varLabel}`;

              options.push({
                name: variantOptionName,
                packSizeText: `${parsedVar.measurement} ${parsedVar.unit}`,
                packSizeKg: parsedVar.packSizeKg,
                sourceProductId: sItem.id,
                sourceProductName: sItem.product,
              });
            });
          }
        });
      } else {
        // Dynamic fallback variants for this product
        const prodName = selectedName || 'Product';
        const uomUpper = itemUom.toUpperCase();
        if (uomUpper === 'L' || uomUpper === 'ML' || uomUpper.includes('LITRE')) {
          options.push(
            { name: `${prodName} 1 L`, packSizeText: '1 L', packSizeKg: 1.0, sourceProductId: sItem.id, sourceProductName: sItem.product },
            { name: `${prodName} 500 ML`, packSizeText: '500 ML', packSizeKg: 0.5, sourceProductId: sItem.id, sourceProductName: sItem.product },
            { name: `${prodName} 250 ML`, packSizeText: '250 ML', packSizeKg: 0.25, sourceProductId: sItem.id, sourceProductName: sItem.product },
            { name: `${prodName} 100 ML`, packSizeText: '100 ML', packSizeKg: 0.1, sourceProductId: sItem.id, sourceProductName: sItem.product },
            { name: `${prodName} 5 L`, packSizeText: '5 L', packSizeKg: 5.0, sourceProductId: sItem.id, sourceProductName: sItem.product }
          );
        } else if (uomUpper.includes('PACKET') || uomUpper.includes('PCS') || uomUpper.includes('PIECE') || uomUpper.includes('BOX') || uomUpper === 'P') {
          const nameUpper = selectedName.toUpperCase();
          if (nameUpper.includes('KG') || nameUpper.includes('KILOGRAM') || nameUpper.includes('GM') || nameUpper.includes('GRAM')) {
            options.push(
              { name: `${prodName} 1 KG`, packSizeText: '1 KG', packSizeKg: 1.0, sourceProductId: sItem.id, sourceProductName: sItem.product },
              { name: `${prodName} 500 GM`, packSizeText: '500 GM', packSizeKg: 0.5, sourceProductId: sItem.id, sourceProductName: sItem.product },
              { name: `${prodName} 250 GM`, packSizeText: '250 GM', packSizeKg: 0.25, sourceProductId: sItem.id, sourceProductName: sItem.product },
              { name: `${prodName} 100 GM`, packSizeText: '100 GM', packSizeKg: 0.1, sourceProductId: sItem.id, sourceProductName: sItem.product },
              { name: `${prodName} 5 KG`, packSizeText: '5 KG', packSizeKg: 5.0, sourceProductId: sItem.id, sourceProductName: sItem.product }
            );
          } else {
            options.push(
              { name: `${prodName} 1 ${itemUom}`, packSizeText: `1 ${itemUom}`, packSizeKg: 1.0, sourceProductId: sItem.id, sourceProductName: sItem.product },
              { name: `${prodName} 5 ${itemUom}`, packSizeText: `5 ${itemUom}`, packSizeKg: 5.0, sourceProductId: sItem.id, sourceProductName: sItem.product },
              { name: `${prodName} 10 ${itemUom}`, packSizeText: `10 ${itemUom}`, packSizeKg: 10.0, sourceProductId: sItem.id, sourceProductName: sItem.product }
            );
          }
        } else {
          options.push(
            { name: `${prodName} 1 KG`, packSizeText: '1 KG', packSizeKg: 1.0, sourceProductId: sItem.id, sourceProductName: sItem.product },
            { name: `${prodName} 500 GM`, packSizeText: '500 GM', packSizeKg: 0.5, sourceProductId: sItem.id, sourceProductName: sItem.product },
            { name: `${prodName} 250 GM`, packSizeText: '250 GM', packSizeKg: 0.25, sourceProductId: sItem.id, sourceProductName: sItem.product },
            { name: `${prodName} 100 GM`, packSizeText: '100 GM', packSizeKg: 0.1, sourceProductId: sItem.id, sourceProductName: sItem.product },
            { name: `${prodName} 5 KG`, packSizeText: '5 KG', packSizeKg: 5.0, sourceProductId: sItem.id, sourceProductName: sItem.product }
          );
        }
      }
    });

    // Deduplicate options by option name
    const uniqueOptions: SkuOption[] = [];
    const seenNames = new Set<string>();
    options.forEach((opt) => {
      if (!seenNames.has(opt.name)) {
        seenNames.add(opt.name);
        uniqueOptions.push(opt);
      }
    });

    return uniqueOptions;
  }, [skuOptionsData, selectedItems, fetchedCatalogProducts]);

  // Step 2 Output SKUs state (empty by default until user adds or API loads)
  const [outputRows, setOutputRows] = useState<OutputSkuRow[]>([]);

  // Reset output rows when switching source inventory selection
  useEffect(() => {
    setOutputRows([]);
  }, [selectedSourceIds]);

  // Per-product inventory calculation logic
  const productCalculations = React.useMemo(() => {
    return selectedItems.map((item) => {
      const consumption = outputRows
        .filter((r) =>
          r.sourceProductId
            ? r.sourceProductId === item.id
            : r.skuName.toLowerCase().includes(item.product.toLowerCase())
        )
        .reduce(
          (acc, row) => acc + (Number(row.plannedUnits) || 0) * row.packSizeKg,
          0
        );

      const available = Number(item.availableQty) || 0;
      const remaining = available - consumption;
      const percentage =
        available > 0
          ? Math.min(100, Math.max(0, (consumption / available) * 100))
          : 0;

      return {
        item,
        available,
        consumption,
        remaining,
        percentage,
      };
    });
  }, [selectedItems, outputRows]);

  const hasExcessConsumption = productCalculations.some((p) => p.remaining < 0);

  // Overall totals grouped by UOM across rows
  const plannedConsumptionByUom = React.useMemo(() => {
    const map: Record<string, number> = {};
    outputRows.forEach((row) => {
      const units = Number(row.plannedUnits) || 0;
      if (units <= 0) return;
      const matchedSource = selectedItems.find((item) => item.id === row.sourceProductId) || primarySelectedItem;
      const uom = (matchedSource?.uom || sourceUom || 'KG').toUpperCase();
      const qty = units * row.packSizeKg;
      map[uom] = (map[uom] || 0) + qty;
    });
    return map;
  }, [outputRows, selectedItems, primarySelectedItem, sourceUom]);

  const plannedConsumptionDisplay = React.useMemo(() => {
    const entries = Object.entries(plannedConsumptionByUom);
    if (entries.length === 0) return `0 ${sourceUom}`;
    return entries.map(([uom, qty]) => `${parseFloat(Number(qty).toFixed(4))} ${uom}`).join(', ');
  }, [plannedConsumptionByUom, sourceUom]);

  const plannedConsumption = parseFloat(
    outputRows
      .reduce(
        (acc, row) => acc + (Number(row.plannedUnits) || 0) * row.packSizeKg,
        0
      )
      .toFixed(4)
  );

  const handleAddSkuRow = () => {
    const defaultOption = activeSkuOptions[0] || {
      name: 'Select Product SKU',
      packSizeText: '1 KG',
      packSizeKg: 1.0,
    };

    const newRow: OutputSkuRow = {
      id: `row-${Date.now()}`,
      skuName: defaultOption.name,
      packSizeText: defaultOption.packSizeText,
      packSizeKg: defaultOption.packSizeKg,
      plannedUnits: '',
      sourceProductId: defaultOption.sourceProductId,
      sourceProductName: defaultOption.sourceProductName,
    };
    setOutputRows((prev) => [...prev, newRow]);
  };

  const handleRemoveRow = (id: string) => {
    setOutputRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleSkuChange = (id: string, newSkuName: string) => {
    const matchedOption = activeSkuOptions.find((opt) => opt.name === newSkuName);
    if (!matchedOption) return;

    setOutputRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              skuName: matchedOption.name,
              packSizeText: matchedOption.packSizeText,
              packSizeKg: matchedOption.packSizeKg,
              sourceProductId: matchedOption.sourceProductId,
              sourceProductName: matchedOption.sourceProductName,
            }
          : r
      )
    );
  };

  const handleUnitsChange = (id: string, val: string) => {
    const num = val === '' ? '' : Math.max(0, parseInt(val) || 0);
    setOutputRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, plannedUnits: num } : r))
    );
  };

  const handleSaveWorkOrder = async (targetStatus: 'DRAFT' | 'PENDING') => {
    setErrorMessage(null);
    if (selectedSourceIds.length === 0 || selectedItems.length === 0) {
      setErrorMessage('Please select at least one source inventory product.');
      return;
    }

    const validOutputRows = outputRows.filter(
      (r) => typeof r.plannedUnits === 'number' && r.plannedUnits > 0
    );

    if (validOutputRows.length === 0 || plannedConsumption <= 0) {
      setErrorMessage('Please add at least 1 output SKU with planned units greater than 0.');
      return;
    }

    setIsSubmitting(true);
    try {
      await workOrderService.createWorkOrder({
        productId: (primarySelectedItem as any)?.productId || primarySelectedItem?.id || selectedSourceIds[0],
        requiredQty: plannedConsumption,
        status: targetStatus,
        priority: priority,
        remarks: remarks.trim() || undefined,
        sourceItems: selectedItems.map((item) => ({
          id: item.id,
          sku: item.sku,
          product: item.product,
          batch: item.batch,
          availableQty: item.availableQty,
          uom: item.uom,
        })),
        outputAllocations: validOutputRows.map((r) => ({
          skuName: r.skuName,
          packSizeText: r.packSizeText,
          packSizeKg: r.packSizeKg,
          plannedUnits: Number(r.plannedUnits),
          totalQtyKg: parseFloat((Number(r.plannedUnits) * r.packSizeKg).toFixed(4)),
          sourceProductId: r.sourceProductId,
          sourceProductName: r.sourceProductName,
        })),
        sourceBatch: selectedItems.map((i) => i.batch).filter(Boolean).join(', '),
      });

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err: any) {
      console.error('Failed to create work order:', err);
      const apiErr =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'Failed to save work order. Please try again.';
      setErrorMessage(apiErr);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContinue = () => {
    if (activeStep < 3) {
      setActiveStep((prev) => prev + 1);
    } else {
      onClose();
    }
  };

  return (
    <div className="w-full space-y-6 font-sans text-slate-800 dark:text-gray-100 pb-10 animate-in fade-in duration-300">
      {/* Top Header Navigation & Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onClose}
          className="p-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-slate-700 dark:text-gray-200 hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
          title="Back"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Create Packing Work Order
          </h1>
          <p className="text-xs text-slate-500 dark:text-gray-400 font-medium">
            Only inventory with available status, a valid batch, an active location and quantity greater than zero is listed.
          </p>
        </div>
      </div>

      {/* 3-Step Progress Indicators */}
      <div className="flex items-center gap-3">
        {/* Step 01 */}
        <div
          onClick={() => setActiveStep(1)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-xs font-bold transition-all cursor-pointer ${activeStep === 1
            ? 'bg-[#044e3a] text-white border-[#044e3a] shadow-xs'
            : activeStep > 1
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
              : 'bg-white dark:bg-gray-800 text-slate-400 border-slate-200 dark:border-gray-700'
            }`}
        >
          <span
            className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black ${activeStep === 1
              ? 'bg-[#06382a] text-emerald-300'
              : activeStep > 1
                ? 'bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100'
                : 'bg-slate-100 dark:bg-gray-700 text-slate-400'
              }`}
          >
            01
          </span>
          <span>Select Source</span>
        </div>

        <div className="w-6 h-px bg-slate-200 dark:bg-gray-700" />

        {/* Step 02 */}
        <div
          onClick={() => selectedSourceIds.length > 0 && setActiveStep(2)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-xs font-bold transition-all cursor-pointer ${activeStep === 2
            ? 'bg-[#044e3a] text-white border-[#044e3a] shadow-xs'
            : activeStep > 2
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
              : 'bg-white dark:bg-gray-800 text-slate-400 border-slate-200 dark:border-gray-700'
            }`}
        >
          <span
            className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black ${activeStep === 2
              ? 'bg-[#06382a] text-emerald-300'
              : activeStep > 2
                ? 'bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100'
                : 'bg-slate-100 dark:bg-gray-700 text-slate-400'
              }`}
          >
            02
          </span>
          <span>Select Output SKUs</span>
        </div>

        <div className="w-6 h-px bg-slate-200 dark:bg-gray-700" />

        {/* Step 03 */}
        <div
          onClick={() => selectedSourceIds.length > 0 && activeStep >= 2 && setActiveStep(3)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-xs font-bold transition-all cursor-pointer ${activeStep === 3
            ? 'bg-[#044e3a] text-white border-[#044e3a] shadow-xs'
            : 'bg-white dark:bg-gray-800 text-slate-400 border-slate-200 dark:border-gray-700 cursor-not-allowed'
            }`}
        >
          <span
            className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black ${activeStep === 3
              ? 'bg-[#06382a] text-emerald-300'
              : 'bg-slate-100 dark:bg-gray-700 text-slate-400'
              }`}
          >
            03
          </span>
          <span>Review & Submit</span>
        </div>
      </div>

      {/* STEP 1 CONTENT: SELECT SOURCE INVENTORY */}
      {activeStep === 1 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Eligible Source Inventory
              </h2>
              <p className="text-xs text-slate-400 dark:text-gray-400 font-medium mt-0.5">
                Raw / unpacked inventory available for repacking
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search inventory, SKU, batch..."
                value={sourceSearchTerm}
                onChange={(e) => {
                  setSourceSearchTerm(e.target.value);
                  setSourceCurrentPage(1);
                }}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-gray-700/50 border border-slate-200 dark:border-gray-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#044e3a] focus:border-[#044e3a]"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            {isLoadingProducts ? (
              <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
                <Loader2 size={28} className="animate-spin text-[#044e3a]" />
                <span className="text-xs font-bold text-slate-500 dark:text-gray-400">
                  Loading eligible source inventory...
                </span>
              </div>
            ) : filteredSourceList.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
                <PackageSearch size={32} className="text-slate-300 dark:text-gray-600" />
                <span className="text-xs font-bold text-slate-500 dark:text-gray-400">
                  {liveSourceData.length > 0
                    ? `No eligible source inventory items matching "${sourceSearchTerm}".`
                    : 'No eligible source inventory items found.'}
                </span>
                {liveSourceData.length > 0 ? (
                  <button
                    onClick={() => {
                      setSourceSearchTerm('');
                      setSourceCurrentPage(1);
                    }}
                    className="text-xs text-[#044e3a] dark:text-emerald-400 font-bold hover:underline cursor-pointer mt-1"
                  >
                    Clear search
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-400 dark:text-gray-500">
                    Items with available status, a valid batch, and quantity &gt; 0 will appear here when connected to backend API.
                  </span>
                )}
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 dark:bg-gray-900/40 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-gray-400 border-b border-slate-200 dark:border-gray-700">
                    <th className="py-3 px-4 w-12 text-center">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={toggleSelectAll}
                        title="Select / Deselect All"
                        className="w-4 h-4 text-[#044e3a] focus:ring-[#044e3a] accent-[#044e3a] rounded cursor-pointer"
                      />
                    </th>
                    <th className="py-3 px-4 font-bold">PRODUCT SKU</th>
                    <th className="py-3 px-4 font-bold">PRODUCT</th>
                    <th className="py-3 px-4 font-bold">CATEGORY</th>
                    <th className="py-3 px-4 font-bold">TYPE</th>
                    <th className="py-3 px-4 font-bold">BATCH</th>
                    <th className="py-3 px-4 font-bold text-right">AVAILABLE QTY</th>
                    <th className="py-3 px-4 font-bold">UOM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-gray-700/50 font-medium">
                  {paginatedSourceList.map((row) => {
                    const isSelected = selectedSourceIds.includes(row.id);
                    return (
                      <tr
                        key={row.id}
                        onClick={() => toggleSourceSelection(row.id)}
                        className={`cursor-pointer transition-colors ${isSelected
                          ? 'bg-[#ecfdf5] dark:bg-emerald-950/30'
                          : 'hover:bg-slate-50/70 dark:hover:bg-gray-700/30'
                          }`}
                      >
                        <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            name="sourceInventory"
                            checked={isSelected}
                            onChange={() => toggleSourceSelection(row.id)}
                            className="w-4 h-4 text-[#044e3a] focus:ring-[#044e3a] accent-[#044e3a] rounded cursor-pointer"
                          />
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-700 dark:text-gray-300">
                          {row.sku || row.id}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                          {row.product}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-gray-300">
                          {row.category}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-gray-300 font-semibold">
                          {row.productType || 'RAW_MATERIAL'}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-gray-400">
                          {row.batch}
                        </td>
                        <td className="py-3.5 px-4 font-extrabold text-right text-slate-900 dark:text-white font-mono text-sm">
                          {row.availableQty}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-600 dark:text-gray-400">
                          {row.uom}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Source Inventory Pagination */}
          {filteredSourceList.length > 0 && (
            <div className="px-4 py-3 border-t border-slate-100 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-slate-500 dark:text-gray-400 whitespace-nowrap">Show</span>
                <select
                  value={sourceItemsPerPage.toString()}
                  onChange={(e) => {
                    setSourceItemsPerPage(Number(e.target.value));
                    setSourceCurrentPage(1);
                  }}
                  className="h-7 text-xs border border-slate-200 dark:border-gray-600 rounded px-2 focus:outline-none focus:ring-1 focus:ring-[#044e3a] bg-white dark:bg-gray-700 text-slate-800 dark:text-gray-200 font-medium"
                >
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
                <span className="text-slate-500 dark:text-gray-400 whitespace-nowrap">
                  Showing{" "}
                  <span className="font-bold text-slate-800 dark:text-gray-200">
                    {Math.min((sourceCurrentPage - 1) * sourceItemsPerPage + 1, filteredSourceList.length)}
                  </span>{" "}
                  to{" "}
                  <span className="font-bold text-slate-800 dark:text-gray-200">
                    {Math.min(sourceCurrentPage * sourceItemsPerPage, filteredSourceList.length)}
                  </span>{" "}
                  of{" "}
                  <span className="font-bold text-slate-800 dark:text-gray-200">
                    {filteredSourceList.length}
                  </span>{" "}
                  items
                </span>
              </div>

              <div className="flex items-center gap-1">
                <Pagination
                  currentPage={sourceCurrentPage}
                  pagination={sourcePagination}
                  onPageChange={setSourceCurrentPage}
                />
              </div>
            </div>
          )}

          <div className="p-4 bg-slate-50/90 dark:bg-gray-900/50 border-t border-slate-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs font-semibold text-slate-600 dark:text-gray-300 flex items-center gap-1.5 flex-wrap">
              {selectedItems.length > 0 ? (
                <>
                  <span className="text-slate-400 dark:text-gray-500 font-normal">Selected:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {selectedItems.length} product{selectedItems.length > 1 ? 's' : ''} ({selectedItems.map((i) => i.product).join(', ')})
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="font-mono font-bold">Total Bulk: {sourceQtyDisplay}</span>
                </>
              ) : (
                <span className="text-slate-400 italic">No source inventory selected</span>
              )}
            </div>

            <button
              disabled={selectedSourceIds.length === 0}
              onClick={handleContinue}
              className={`px-6 py-2.5 rounded-lg font-bold text-xs shadow-xs transition-all flex items-center gap-2 ${selectedSourceIds.length > 0
                ? 'bg-[#044e3a] hover:bg-[#033c2d] text-white cursor-pointer active:scale-98'
                : 'bg-slate-200 dark:bg-gray-700 text-slate-400 dark:text-gray-500 cursor-not-allowed'
                }`}
            >
              <span>Continue</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 2 CONTENT: SELECT OUTPUT SKUS */}
      {activeStep === 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 flex flex-col gap-6">
            {/* Card 1: Source Summary */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-xs p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-gray-700 pb-3">
                <h2 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                  Source Summary ({selectedItems.length} Selected Product{selectedItems.length > 1 ? 's' : ''})
                </h2>
                <span className="text-xs font-mono font-bold text-[#044e3a] bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 px-2.5 py-1 rounded-md">
                  Total Available Bulk: {sourceQtyDisplay}
                </span>
              </div>
              
              <div className="divide-y divide-slate-100 dark:divide-gray-700/50">
                {selectedItems.map((item) => (
                  <div key={item.id} className="py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white">{item.product}</span>
                      <span className="text-slate-400 dark:text-gray-500 ml-2 font-mono text-[11px]">(SKU: {item.sku || item.id})</span>
                    </div>
                    <div className="flex items-center gap-4 text-slate-600 dark:text-gray-300 font-mono text-[11px]">
                      <span>Batch: <strong className="text-slate-800 dark:text-gray-200">{item.batch}</strong></span>
                      <span>Qty: <strong className="text-slate-900 dark:text-white">{item.availableQty} {item.uom}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Card 2: Output SKUs Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-xs overflow-hidden flex flex-col">
              <div className="p-5 border-b border-slate-100 dark:border-gray-700 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Output SKUs
                  </h2>
                  <p className="text-xs text-slate-400 dark:text-gray-400 font-medium mt-0.5">
                    Planned units per catalogue SKU
                  </p>
                </div>
                <button
                  onClick={handleAddSkuRow}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 dark:border-gray-700 rounded-lg text-xs font-bold text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Add SKU</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                {outputRows.length === 0 ? (
                  <div className="p-8 text-center flex flex-col items-center justify-center gap-2">
                    <span className="text-xs font-semibold text-slate-500 dark:text-gray-400">
                      No output SKUs added yet.
                    </span>
                    <button
                      onClick={handleAddSkuRow}
                      className="text-xs font-bold text-[#044e3a] hover:underline"
                    >
                      Click + Add SKU to add target product packaging
                    </button>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/70 dark:bg-gray-900/40 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-gray-400 border-b border-slate-200 dark:border-gray-700">
                        <th className="py-3 px-4 font-bold w-[35%]">SKU</th>
                        <th className="py-3 px-4 font-bold w-[20%]">PACK SIZE</th>
                        <th className="py-3 px-4 font-bold text-center w-[20%]">PLANNED UNITS</th>
                        <th className="py-3 px-4 font-bold text-right w-[20%]">CALCULATED QUANTITY</th>
                        <th className="py-3 px-4 font-bold text-center w-[5%]">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-gray-700/50 font-medium">
                      {outputRows.map((row) => {
                        const numUnits = Number(row.plannedUnits) || 0;
                        const calcQty = (numUnits * row.packSizeKg).toFixed(2);
                        return (
                          <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-700/20">
                            <td className="py-3 px-4">
                              {activeSkuOptions.length > 0 ? (
                                <select
                                  value={row.skuName}
                                  onChange={(e) => handleSkuChange(row.id, e.target.value)}
                                  className="w-full p-2 border border-slate-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg bg-white font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-800 text-xs cursor-pointer"
                                >
                                  {activeSkuOptions.map((opt: SkuOption) => (
                                    <option key={opt.name} value={opt.name}>
                                      {opt.name}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  type="text"
                                  value={row.skuName}
                                  onChange={(e) =>
                                    setOutputRows((prev) =>
                                      prev.map((r) =>
                                        r.id === row.id ? { ...r, skuName: e.target.value } : r
                                      )
                                    )
                                  }
                                  placeholder="Enter SKU Name..."
                                  className="w-full p-2 border border-slate-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg font-semibold text-xs outline-none focus:ring-1 focus:ring-emerald-800"
                                />
                              )}
                            </td>
                            <td className="py-3 px-4 font-bold text-slate-700 dark:text-gray-300">
                              {row.packSizeText}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <input
                                type="number"
                                min={0}
                                value={row.plannedUnits}
                                onChange={(e) =>
                                  handleUnitsChange(row.id, e.target.value)
                                }
                                placeholder=""
                                className="w-20 p-1.5 border border-slate-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg text-center font-bold text-slate-800 dark:text-gray-200 outline-none focus:ring-1 focus:ring-emerald-800"
                              />
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white font-mono text-sm">
                              {(() => {
                                const matchedSource = selectedItems.find((item) => item.id === row.sourceProductId) || primarySelectedItem;
                                const invUnit = matchedSource?.uom || sourceUom || 'KG';
                                return `${calcQty} ${invUnit}`;
                              })()}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={() => handleRemoveRow(row.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                                title="Remove SKU"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="p-4 bg-slate-50/80 dark:bg-gray-900/50 border-t border-slate-200 dark:border-gray-700 flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 dark:text-gray-400 uppercase tracking-wider">
                  TOTAL PLANNED OUTPUT
                </span>
                <span className="text-sm font-extrabold text-slate-900 dark:text-white font-mono">
                  {plannedConsumptionDisplay}
                </span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-xs p-5 space-y-4">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Inventory Calculation
              </h2>

              <div className="space-y-4 divide-y divide-slate-100 dark:divide-gray-700/50">
                {productCalculations.map(({ item, available, consumption, remaining, percentage }) => (
                  <div key={item.id} className="pt-3 first:pt-0 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-white text-xs truncate max-w-[160px]">{item.product}</span>
                      <span className="text-[10px] font-mono text-slate-400 dark:text-gray-500">Batch: {item.batch}</span>
                    </div>

                    <div className="flex justify-between items-center text-slate-500 dark:text-gray-400">
                      <span>Source Quantity</span>
                      <span className="font-bold text-slate-800 dark:text-gray-200 font-mono">
                        {available} {item.uom}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-slate-500 dark:text-gray-400">
                      <span>Planned Consumption</span>
                      <span className="font-mono font-semibold text-slate-700 dark:text-gray-300">
                        {consumption.toFixed(2)} {item.uom}
                      </span>
                    </div>

                    <div className="flex justify-between items-center font-bold">
                      <span className="text-slate-700 dark:text-gray-300">Remaining Bulk</span>
                      <span
                        className={`font-mono text-xs ${remaining < 0
                          ? 'text-rose-600 dark:text-rose-400 font-black'
                          : 'text-[#047857] dark:text-emerald-400'
                          }`}
                      >
                        {remaining.toFixed(2)} {item.uom}
                      </span>
                    </div>

                    <div className="space-y-1 pt-1">
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${remaining < 0 ? 'bg-rose-500' : 'bg-[#047857]'}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 dark:text-gray-400">
                        {percentage.toFixed(1)}% of {item.product} consumed.
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  onClick={() => setActiveStep(1)}
                  className="flex-1 py-2.5 border border-slate-200 dark:border-gray-700 rounded-lg text-xs font-bold text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors text-center cursor-pointer"
                >
                  Back
                </button>
                <button
                  disabled={hasExcessConsumption || outputRows.length === 0}
                  onClick={handleContinue}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-bold shadow-xs transition-all text-center cursor-pointer ${!hasExcessConsumption && outputRows.length > 0
                    ? 'bg-[#047857] hover:bg-[#036247] text-white active:scale-98'
                    : 'bg-slate-200 dark:bg-gray-700 text-slate-400 dark:text-gray-500 cursor-not-allowed'
                    }`}
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3 CONTENT: REVIEW & SUBMIT */}
      {activeStep === 3 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 flex flex-col gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-xs p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-gray-700 pb-3">
                <h2 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                  Source Inventory ({selectedItems.length} Selected Product{selectedItems.length > 1 ? 's' : ''})
                </h2>
                <span className="text-xs font-mono font-bold text-[#044e3a] bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 px-2.5 py-1 rounded-md">
                  Total Available Bulk: {sourceQtyDisplay}
                </span>
              </div>
              
              <div className="divide-y divide-slate-100 dark:divide-gray-700/50">
                {selectedItems.map((item) => (
                  <div key={item.id} className="py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white">{item.product}</span>
                      <span className="text-slate-400 dark:text-gray-500 ml-2 font-mono text-[11px]">(SKU: {item.sku || item.id})</span>
                    </div>
                    <div className="flex items-center gap-4 text-slate-600 dark:text-gray-300 font-mono text-[11px]">
                      <span>Batch: <strong className="text-slate-800 dark:text-gray-200">{item.batch}</strong></span>
                      <span>Qty: <strong className="text-slate-900 dark:text-white">{item.availableQty} {item.uom}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-xs overflow-hidden flex flex-col">
              <div className="p-5 border-b border-slate-100 dark:border-gray-700">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Output Plan
                </h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 dark:bg-gray-900/40 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-gray-400 border-b border-slate-200 dark:border-gray-700">
                      <th className="py-3 px-4 font-bold w-[40%]">TARGET SKU</th>
                      <th className="py-3 px-4 font-bold w-[20%]">PACK SIZE</th>
                      <th className="py-3 px-4 font-bold text-center w-[20%]">UNITS</th>
                      <th className="py-3 px-4 font-bold text-right w-[20%]">TOTAL REQ QUANTITY</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-gray-700/50 font-medium">
                    {outputRows.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-700/20">
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                          {row.skuName}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-gray-300">
                          {row.packSizeText}
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-slate-800 dark:text-gray-200">
                          {row.plannedUnits}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-white font-mono text-sm">
                          {(() => {
                            const matchedSource = selectedItems.find((item) => item.id === row.sourceProductId) || primarySelectedItem;
                            const invUnit = matchedSource?.uom || sourceUom || 'KG';
                            return `${((Number(row.plannedUnits) || 0) * row.packSizeKg).toFixed(2)} ${invUnit}`;
                          })()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-xs p-5 space-y-3">
                <h2 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                  Priority Level
                </h2>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as WoPriority)}
                  className="w-full p-2.5 border border-slate-200 dark:border-gray-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-gray-200 bg-white dark:bg-gray-900 focus:outline-none focus:ring-1 focus:ring-[#047857]"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-xs p-5 space-y-3">
                <h2 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                  Remarks (optional)
                </h2>
                <textarea
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Add context for the approver — line allocation, packaging notes..."
                  className="w-full p-2.5 border border-slate-200 dark:border-gray-700 rounded-lg text-xs text-slate-800 dark:text-gray-200 bg-white dark:bg-gray-900 focus:outline-none focus:ring-1 focus:ring-[#047857] resize-y placeholder:text-slate-400"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-xs p-5 space-y-4">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Inventory Impact
              </h2>

              <div className="space-y-4 divide-y divide-slate-100 dark:divide-gray-700/50">
                {productCalculations.map(({ item, available, consumption, remaining }) => (
                  <div key={item.id} className="pt-3 first:pt-0 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-white text-xs truncate max-w-[160px]">{item.product}</span>
                      <span className="text-[10px] font-mono text-slate-400 dark:text-gray-500">Batch: {item.batch}</span>
                    </div>

                    <div className="flex justify-between items-center text-slate-500 dark:text-gray-400">
                      <span>Input</span>
                      <span className="font-bold text-slate-800 dark:text-gray-200 font-mono">
                        {available} {item.uom}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-slate-500 dark:text-gray-400">
                      <span>Planned Consumption</span>
                      <span className="font-mono font-semibold text-slate-700 dark:text-gray-300">
                        {consumption.toFixed(2)} {item.uom}
                      </span>
                    </div>

                    <div className="flex justify-between items-center font-bold">
                      <span className="text-slate-500 dark:text-gray-400 font-normal">Remaining</span>
                      <span
                        className={`font-mono text-xs ${remaining < 0
                          ? 'text-rose-600 dark:text-rose-400 font-bold'
                          : 'text-[#047857] dark:text-emerald-400 font-bold'
                          }`}
                      >
                        {remaining.toFixed(2)} {item.uom}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-2.5 pt-4">
                {errorMessage && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-lg text-xs font-medium">
                    {errorMessage}
                  </div>
                )}
                <button
                  disabled={isSubmitting || plannedConsumption <= 0}
                  onClick={() => handleSaveWorkOrder('PENDING')}
                  className="w-full py-3 bg-[#047857] hover:bg-[#036247] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-bold text-xs shadow-xs transition-all text-center cursor-pointer active:scale-98 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <span>Submit for Approval</span>
                  )}
                </button>
                <button
                  disabled={isSubmitting || plannedConsumption <= 0}
                  onClick={() => handleSaveWorkOrder('DRAFT')}
                  className="w-full py-3 bg-slate-100 dark:bg-gray-700 hover:bg-slate-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-200 dark:border-gray-600 text-slate-800 dark:text-gray-100 rounded-lg font-bold text-xs transition-all text-center cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Draft...</span>
                    </>
                  ) : (
                    <span>Save Draft</span>
                  )}
                </button>
                <button
                  disabled={isSubmitting}
                  onClick={() => setActiveStep(2)}
                  className="w-full py-2 text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white font-bold text-xs text-center cursor-pointer"
                >
                  Back
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
