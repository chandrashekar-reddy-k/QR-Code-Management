import prisma from '../../utils/prisma.js';
import { generateId } from '../../utils/idGenerator.js';
import { logActivity } from '../../utils/activityLogger.js';
import { resolveStoreScopeFromReq, resolveWriteStoreId } from '../../utils/resolveStoreScope.js';

// Get Payments
export const getPayments = async (req, res) => {
  try {
    const { vendorId, storeId } = req.query;
    const storeScope = await resolveStoreScopeFromReq(req);
    const where = { ...storeScope };
    if (vendorId) where.vendorId = vendorId;
  
    const payments = await prisma.vendorPayment.findMany({
      where,
      orderBy: { paymentDate: 'desc' },
      include: {
        vendor: { select: { id: true, vendorName: true, mobile: true } },
        invoice: { 
          select: { 
            id: true, 
            invoiceNumber: true, 
            totalAmount: true, 
            paidAmount: true,
            items: {
              include: {
                product: { select: { id: true, name: true, sku: true, unit: true, category: true } }
              }
            }
          } 
        },
        allocations: {
          include: {
            invoice: { 
              select: { 
                id: true, 
                invoiceNumber: true, 
                totalAmount: true, 
                paidAmount: true,
                items: {
                  include: {
                    product: { select: { id: true, name: true, sku: true, unit: true, category: true } }
                  }
                }
              } 
            }
          }
        }
      }
    });

    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching payments', error: error.message });
  }
};

// Get Outstanding Invoices for a Vendor
export const getOutstandingInvoices = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { storeId } = req.query;

    const storeScope = await resolveStoreScopeFromReq(req);
    const where = {
      vendorId,
      status: { in: ['CONFIRMED', 'PARTIAL_PAID'] },
      ...storeScope
    };

    const invoices = await prisma.purchaseInvoice.findMany({
      where,
      orderBy: { invoiceDate: 'asc' }
    });

    const outstanding = invoices.map(inv => {
      const outstandingAmt = inv.totalAmount - inv.paidAmount;
      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        totalAmount: inv.totalAmount,
        paidAmount: inv.paidAmount,
        outstanding: outstandingAmt,
        dueDate: inv.dueDate || inv.invoiceDate
      };
    }).filter(inv => inv.outstanding > 0);

    res.json(outstanding);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching outstanding invoices', error: error.message });
  }
};

// Create Payment
export const createPayment = async (req, res) => {
  try {
    const { vendorId, invoiceId, amount, mode, referenceNo, paymentDate, remarks } = req.body;
    const storeId = req.body.storeId || req.user?.storeId || null;

    if (!vendorId || amount === undefined || amount === null || amount === '') {
      return res.status(400).json({ message: 'Vendor and amount are required' });
    }

    const payAmount = parseFloat(amount);
    if (isNaN(payAmount) || payAmount < 0) {
      return res.status(400).json({ message: 'Payment amount cannot be negative' });
    }

    if (payAmount === 0 && !invoiceId) {
      return res.status(400).json({ message: 'Payment amount must be greater than zero for general payments' });
    }

    const payment = await prisma.$transaction(async (tx) => {
      // 1. Generate Display ID
      const displayId = await generateId({
        entity: 'VPAY',
        storeId
      });

      // 2. Create the payment record
      const pmt = await tx.vendorPayment.create({
        data: {
          storeId,
          displayId,
          vendorId,
          invoiceId: invoiceId || null,
          amount: payAmount,
          mode,
          referenceNo,
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          isAdvance: !invoiceId,
          remarks
        }
      });

      // 3. Handle allocations and invoice updates if invoiceId is specified
      if (invoiceId) {
        const invoice = await tx.purchaseInvoice.findUnique({
          where: { id: invoiceId }
        });

        if (!invoice) {
          throw new Error('Invoice not found');
        }

        const remainingToPay = invoice.totalAmount - invoice.paidAmount;
        const allocatedAmount = Math.min(payAmount, remainingToPay);

        // Create allocation
        await tx.vendorPaymentAllocation.create({
          data: {
            paymentId: pmt.id,
            invoiceId,
            amount: allocatedAmount
          }
        });

        // Update invoice paidAmount and status
        const newPaidAmount = invoice.paidAmount + allocatedAmount;
        const newStatus = newPaidAmount >= invoice.totalAmount ? 'PAID' : (newPaidAmount > 0 ? 'PARTIAL_PAID' : 'CONFIRMED');

        await tx.purchaseInvoice.update({
          where: { id: invoiceId },
          data: {
            paidAmount: newPaidAmount,
            status: newStatus
          }
        });
      }

      // 4. Update Vendor Ledger & Balance
      const currentVendor = await tx.vendor.findUnique({ where: { id: vendorId } });
      if (!currentVendor) {
        throw new Error('Vendor not found');
      }

      const newBalance = currentVendor.currentBalance - payAmount;

      await tx.vendorLedger.create({
        data: {
          storeId,
          vendorId,
          type: 'PAYMENT',
          credit: payAmount,
          balance: newBalance,
          reference: pmt.id,
          description: invoiceId ? `Payment for Invoice #${invoiceId}` : 'Advance Payment'
        }
      });

      await tx.vendor.update({
        where: { id: vendorId },
        data: { currentBalance: newBalance }
      });

      return pmt;
    });

    logActivity({
      userId: req.user?.id,
      storeId: storeId || req.user?.storeId,
      action: 'VENDOR_PAYMENT_CREATED',
      details: `Recorded payment of ₹${payAmount.toFixed(2)} to vendor. Reference: ${referenceNo || 'None'}`,
      metadata: { paymentId: payment.id, vendorId, amount: payAmount }
    });

    res.status(201).json({ message: 'Payment recorded successfully', payment });
  } catch (error) {
    console.error('❌ Create Payment Error:', error);
    res.status(500).json({ message: 'Error recording payment', error: error.message });
  }
};

// Delete Payment
export const deletePayment = async (req, res) => {
  try {
    const { id } = req.params;

    const payment = await prisma.vendorPayment.findUnique({
      where: { id },
      include: { allocations: true }
    });

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    const payAmount = payment.amount;
    const vendorId = payment.vendorId;

    await prisma.$transaction(async (tx) => {
      // 1. Revert Invoice allocations
      for (const alloc of payment.allocations) {
        const invoice = await tx.purchaseInvoice.findUnique({
          where: { id: alloc.invoiceId }
        });

        if (invoice) {
          const newPaidAmount = Math.max(0, invoice.paidAmount - alloc.amount);
          const newStatus = newPaidAmount <= 0 ? 'CONFIRMED' : 'PARTIAL_PAID';

          await tx.purchaseInvoice.update({
            where: { id: alloc.invoiceId },
            data: {
              paidAmount: newPaidAmount,
              status: newStatus
            }
          });
        }
      }

      // 2. Revert Vendor balance and ledger entries
      const currentVendor = await tx.vendor.findUnique({ where: { id: vendorId } });
      if (currentVendor) {
        const newBalance = currentVendor.currentBalance + payAmount;

        await tx.vendor.update({
          where: { id: vendorId },
          data: { currentBalance: newBalance }
        });
      }

      // Delete the vendor ledger records referring to this payment
      await tx.vendorLedger.deleteMany({
        where: { reference: id, type: 'PAYMENT' }
      });

      // 3. Delete the payment
      await tx.vendorPayment.delete({
        where: { id }
      });
    });

    logActivity({
      userId: req.user?.id,
      action: 'VENDOR_PAYMENT_DELETED',
      details: `Reverted payment of ₹${payAmount.toFixed(2)} for vendor.`,
      metadata: { paymentId: id, vendorId }
    });

    res.json({ message: 'Payment deleted successfully' });
  } catch (error) {
    console.error('❌ Delete Payment Error:', error);
    res.status(500).json({ message: 'Error deleting payment', error: error.message });
  }
};

// Update Payment
export const updatePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { vendorId, invoiceId, amount, mode, referenceNo, paymentDate, remarks } = req.body;

    const existingPayment = await prisma.vendorPayment.findUnique({
      where: { id },
      include: { allocations: true }
    });

    if (!existingPayment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    const newPayAmount = parseFloat(amount);
    if (isNaN(newPayAmount) || newPayAmount < 0) {
      return res.status(400).json({ message: 'Valid payment amount is required' });
    }

    const targetVendorId = vendorId || existingPayment.vendorId;
    const targetInvoiceId = invoiceId !== undefined ? invoiceId : existingPayment.invoiceId;

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Revert previous allocations on invoices
      for (const alloc of existingPayment.allocations) {
        const inv = await tx.purchaseInvoice.findUnique({ where: { id: alloc.invoiceId } });
        if (inv) {
          const revertedPaid = Math.max(0, inv.paidAmount - alloc.amount);
          await tx.purchaseInvoice.update({
            where: { id: alloc.invoiceId },
            data: {
              paidAmount: revertedPaid,
              status: revertedPaid <= 0 ? 'CONFIRMED' : 'PARTIAL_PAID'
            }
          });
        }
      }

      // Delete existing allocation records
      await tx.vendorPaymentAllocation.deleteMany({ where: { paymentId: id } });

      // 2. Revert previous vendor balance
      const prevVendor = await tx.vendor.findUnique({ where: { id: existingPayment.vendorId } });
      if (prevVendor) {
        await tx.vendor.update({
          where: { id: existingPayment.vendorId },
          data: { currentBalance: prevVendor.currentBalance + existingPayment.amount }
        });
      }

      // Revert previous vendor ledger
      await tx.vendorLedger.deleteMany({
        where: { reference: id, type: 'PAYMENT' }
      });

      // 3. Update the payment record
      const pmt = await tx.vendorPayment.update({
        where: { id },
        data: {
          vendorId: targetVendorId,
          invoiceId: targetInvoiceId || null,
          amount: newPayAmount,
          mode: mode || existingPayment.mode,
          referenceNo: referenceNo !== undefined ? referenceNo : existingPayment.referenceNo,
          paymentDate: paymentDate ? new Date(paymentDate) : existingPayment.paymentDate,
          isAdvance: !targetInvoiceId,
          remarks: remarks !== undefined ? remarks : existingPayment.remarks
        }
      });

      // 4. Apply new invoice allocations if linked
      if (targetInvoiceId) {
        const inv = await tx.purchaseInvoice.findUnique({ where: { id: targetInvoiceId } });
        if (inv) {
          const remainingToPay = inv.totalAmount - inv.paidAmount;
          const allocatedAmount = Math.min(newPayAmount, Math.max(0, remainingToPay));

          await tx.vendorPaymentAllocation.create({
            data: {
              paymentId: id,
              invoiceId: targetInvoiceId,
              amount: allocatedAmount
            }
          });

          const newPaid = inv.paidAmount + allocatedAmount;
          await tx.purchaseInvoice.update({
            where: { id: targetInvoiceId },
            data: {
              paidAmount: newPaid,
              status: newPaid >= inv.totalAmount ? 'PAID' : (newPaid > 0 ? 'PARTIAL_PAID' : 'CONFIRMED')
            }
          });
        }
      }

      // 5. Update vendor balance & ledger with new amount
      const targetVendor = await tx.vendor.findUnique({ where: { id: targetVendorId } });
      if (targetVendor) {
        const newBalance = targetVendor.currentBalance - newPayAmount;
        await tx.vendor.update({
          where: { id: targetVendorId },
          data: { currentBalance: newBalance }
        });

        await tx.vendorLedger.create({
          data: {
            storeId: pmt.storeId,
            vendorId: targetVendorId,
            type: 'PAYMENT',
            credit: newPayAmount,
            balance: newBalance,
            reference: id,
            description: targetInvoiceId ? `Payment for Invoice #${targetInvoiceId}` : 'Advance Payment'
          }
        });
      }

      return pmt;
    });

    logActivity({
      userId: req.user?.id,
      action: 'VENDOR_PAYMENT_UPDATED',
      details: `Updated payment of ₹${newPayAmount.toFixed(2)} for vendor.`,
      metadata: { paymentId: id, vendorId: targetVendorId, amount: newPayAmount }
    });

    res.json({ message: 'Payment updated successfully', payment: updated });
  } catch (error) {
    console.error('❌ Update Payment Error:', error);
    res.status(500).json({ message: 'Error updating payment', error: error.message });
  }
};
