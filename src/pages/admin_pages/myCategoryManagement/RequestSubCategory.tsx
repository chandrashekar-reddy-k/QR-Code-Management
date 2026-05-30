import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Save, ChevronDown, ChevronUp, Search } from "lucide-react";
import {
  FormSectionWithDots,
  PrimaryButton,
  Button,
} from "../../../components/ui";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
import BackButton from "../../../components/common/BackButton";

// ---------------- MOCK DATA ----------------
interface SubCategory {
  id: number;
  name: string;
  categoryId: number;
}

interface Category {
  id: number;
  name: string;
  image: string;
  subcategories: SubCategory[];
}

const allCategories: Category[] = [
  {
    id: 1,
    name: "Skincare",
    image:
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=facearea&w=64&h=64",
    subcategories: [
      { id: 1, name: "Cleansers", categoryId: 1 },
      { id: 2, name: "Moisturizers", categoryId: 1 },
    ],
  },
  {
    id: 2,
    name: "Dairy Products",
    image:
      "https://images.unsplash.com/photo-1519864600265-abb23847ef2c?auto=format&fit=facearea&w=64&h=64",
    subcategories: [
      { id: 3, name: "Milk", categoryId: 2 },
      { id: 4, name: "Cheese", categoryId: 2 },
      { id: 5, name: "Butter", categoryId: 2 },
    ],
  },
];

const RequestSubCategory = () => {
  const navigate = useNavigate();

  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [selectedSubCategories, setSelectedSubCategories] = useState<number[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<number[]>([]);
  const [search, setSearch] = useState("");

  // ---------------- HANDLERS ----------------

  const handleCategoryToggle = (id: number) => {
    const category = allCategories.find((c) => c.id === id);
    if (!category) return;

    const subIds = category.subcategories.map((s) => s.id);

    if (selectedCategories.includes(id)) {
      setSelectedCategories((prev) => prev.filter((c) => c !== id));
      setSelectedSubCategories((prev) =>
        prev.filter((sid) => !subIds.includes(sid))
      );
    } else {
      setSelectedCategories((prev) => [...prev, id]);
      setSelectedSubCategories((prev) => [...new Set([...prev, ...subIds])]);
    }
  };

  const handleSubCategoryToggle = (sub: SubCategory) => {
    const isSelected = selectedSubCategories.includes(sub.id);

    if (isSelected) {
      const updated = selectedSubCategories.filter((id) => id !== sub.id);
      setSelectedSubCategories(updated);

      const parentSubs = allCategories
        .find((c) => c.id === sub.categoryId)
        ?.subcategories.map((s) => s.id);

      const stillHas = updated.some((id) => parentSubs?.includes(id));

      if (!stillHas) {
        setSelectedCategories((prev) =>
          prev.filter((c) => c !== sub.categoryId)
        );
      }
    } else {
      setSelectedSubCategories((prev) => [...prev, sub.id]);

      if (!selectedCategories.includes(sub.categoryId)) {
        setSelectedCategories((prev) => [...prev, sub.categoryId]);
      }
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleRemoveCategory = (id: number) => {
    const subIds = allCategories.find((c) => c.id === id)?.subcategories.map(s => s.id) || [];

    setSelectedCategories((prev) => prev.filter((c) => c !== id));
    setSelectedSubCategories((prev) => prev.filter((s) => !subIds.includes(s)));
  };

  const handleRemoveSub = (id: number) => {
    setSelectedSubCategories((prev) => prev.filter((s) => s !== id));
  };

  const filteredSub = (subs: SubCategory[]) =>
    subs.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedCategories.length === 0) {
      alert("Please select at least one category");
      return;
    }

    alert("Request sent successfully!");
    navigate("/categories");
  };

  // ---------------- UI ----------------
  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">

      {/* HEADER */}
      <div className="mb-3 mt-3 flex justify-between items-center">
        <h1 className="text-lg font-bold">Request SubCategory</h1>
        <BackButton />
      </div>

      <Breadcrumbs />

      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-md border p-4 sm:p-6"
      > <div className="max-w-4xl">
        <FormSectionWithDots title="Select Categories & Subcategories">

          {/* CATEGORY CHIPS */}
          <div className="flex flex-wrap gap-2 mb-2">
            {selectedCategories.length === 0 ? (
              <span className="text-sm text-gray-500">
                No categories selected
              </span>
            ) : (
              selectedCategories.map((id) => {
                const cat = allCategories.find((c) => c.id === id);
                return (
                  <span
                    key={id}
                    className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full text-xs"
                  >
                    <img src={cat?.image} className="w-4 h-4 rounded-full" />
                    {cat?.name}
                    <button onClick={() => handleRemoveCategory(id)}>×</button>
                  </span>
                );
              })
            )}
          </div>

          {/* SUBCATEGORY CHIPS */}
          <div className="flex flex-wrap gap-2 mb-3">
            {selectedSubCategories.length === 0 ? (
              <span className="text-sm text-gray-500">
                No subcategories selected
              </span>
            ) : (
              selectedSubCategories.map((id) => {
                const sub = allCategories
                  .flatMap((c) => c.subcategories)
                  .find((s) => s.id === id);

                return (
                  <span
                    key={id}
                    className="px-2 py-1 bg-gray-100 rounded-full text-xs"
                  >
                    {sub?.name}
                    <button onClick={() => handleRemoveSub(id)}>×</button>
                  </span>
                );
              })
            )}
          </div>

          {/* SEARCH */}
          <div className="relative mb-3">
            <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search Category"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
            />
          </div>

          {/* CATEGORY LIST */}
          <div className="border rounded-lg overflow-hidden">
            {allCategories.map((cat) => (
              <div key={cat.id}>
                <div className="flex items-center px-4 py-3 border-b">
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(cat.id)}
                    onChange={() => handleCategoryToggle(cat.id)}
                  />

                  <img src={cat.image} className="w-8 h-8 rounded-full ml-3 mr-2" />

                  <span>{cat.name}</span>

                  <button
                    type="button"
                    className="ml-auto"
                    onClick={() => toggleExpand(cat.id)}
                  >
                    {expandedCategories.includes(cat.id) ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    )}
                  </button>
                </div>

                {expandedCategories.includes(cat.id) && (
                  <div className="ml-10 border-l">
                    {filteredSub(cat.subcategories).map((sub) => (
                      <div
                        key={sub.id}
                        className="flex items-center px-4 py-2"
                      >
                        <input
                          type="checkbox"
                          checked={selectedSubCategories.includes(sub.id)}
                          onChange={() => handleSubCategoryToggle(sub)}
                        />
                        <span className="ml-2">{sub.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </FormSectionWithDots>

        {/* BUTTONS */}
        <div className="flex justify-end gap-3 mt-6">
          <Button onClick={() => navigate("/categories")}>Cancel</Button>
          <PrimaryButton type="submit">
            <Save size={14} />
            Send Request
          </PrimaryButton>
        </div>
        </div>
      </form>
    </div>
  );
};

export default RequestSubCategory;