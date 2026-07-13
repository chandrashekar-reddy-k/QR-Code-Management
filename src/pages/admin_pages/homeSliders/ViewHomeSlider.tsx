import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Image as ImageIcon, Sliders } from "lucide-react";
// import { homeSlidersAPI } from '../../../lib/api';
import { HomeSlider } from "../../../types";
import { Badge } from "../../../components/ui";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
import BackButton from "../../../components/common/BackButton";

// Groceries home slider images
const sliderImages = [
  "https://images.unsplash.com/photo-1542838132-92c53300491e?w=1340&h=740&fit=crop", // Fresh Vegetables Banner
  "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=1340&h=740&fit=crop", // Fresh Fruits Banner
  "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=1340&h=740&fit=crop", // Dairy Products Banner
  "https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=1340&h=740&fit=crop", // Grains & Pulses Banner
  "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=1340&h=740&fit=crop", // Spices & Condiments Banner
  "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=1340&h=740&fit=crop", // Beverages Banner
  "https://images.unsplash.com/photo-1556910103-2c027eb7efd4?w=1340&h=740&fit=crop", // Snacks & Sweets Banner
  "https://images.unsplash.com/photo-1603048297172-c92544798d5a?w=1340&h=740&fit=crop", // Personal Care Banner
];

// Mock data for groceries home sliders (same as ManageHomeSliders)
const mockSliders: HomeSlider[] = [
  {
    id: 1,
    type: "Default",
    name: "Fresh Vegetables Special",
    image: sliderImages[0],
    status: "active",
  },
  {
    id: 2,
    type: "Banner",
    name: "Fresh Fruits Collection",
    image: sliderImages[1],
    status: "active",
  },
  {
    id: 3,
    type: "Promotional",
    name: "Dairy Products Offer",
    image: sliderImages[2],
    status: "active",
  },
  {
    id: 4,
    type: "Default",
    name: "Grains & Pulses Sale",
    image: sliderImages[3],
    status: "inactive",
  },
  {
    id: 5,
    type: "Banner",
    name: "Spices & Condiments",
    image: sliderImages[4],
    status: "active",
  },
  {
    id: 6,
    type: "Promotional",
    name: "Beverages Discount",
    image: sliderImages[5],
    status: "active",
  },
  {
    id: 7,
    type: "Default",
    name: "Snacks & Sweets",
    image: sliderImages[6],
    status: "active",
  },
  {
    id: 8,
    type: "Banner",
    name: "Personal Care Products",
    image: sliderImages[7],
    status: "active",
  },
];

const ViewHomeSlider = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [slider, setSlider] = useState<HomeSlider | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSlider = async () => {
      try {
        setLoading(true);
        // Using mock data for now - replace with API call when ready
        // const data = await homeSlidersAPI.getById(parseInt(id || '0'));
        const foundSlider = mockSliders.find(
          (s) => s.id === parseInt(id || "0")
        );
        if (foundSlider) {
          setSlider(foundSlider);
        } else {
          alert("Home slider not found!");
          navigate("/home-sliders/manage");
        }
      } catch (error) {
        console.error("Error fetching home slider:", error);
        alert("Error fetching home slider. Please try again.");
        navigate("/home-sliders/manage");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchSlider();
    }
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="p-8 text-center">
          <p className="text-gray-500">Loading home slider...</p>
        </div>
      </div>
    );
  }

  if (!slider) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="p-8 text-center">
          <p className="text-gray-500 mb-4">Home slider not found</p>
          <button
            onClick={() => navigate("/home-sliders/manage")}
            className="px-4 py-2 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
          Home Slider Details
        </h1>
        <BackButton to="/home-sliders/manage" />
      </div>

      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* Details Card */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-2 flex items-center gap-2">
              <Sliders size={18} className="text-green-600 dark:text-green-400" />
              Basic Information
            </h2>

            <div>
              <p className="text-[10px] font-medium text-gray-500 uppercase mb-1">
                ID
              </p>
              <p className="text-sm font-semibold text-gray-800">{slider.id}</p>
            </div>

            <div>
              <p className="text-[10px] font-medium text-gray-500 uppercase mb-1">
                Name
              </p>
              <p className="text-sm font-semibold text-gray-800">
                {slider.name}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-medium text-gray-500 uppercase mb-1">
                Type
              </p>
              <p className="text-sm text-gray-700">{slider.type}</p>
            </div>

            <div>
              <p className="text-[10px] font-medium text-gray-500 uppercase mb-1">
                Status
              </p>
              <Badge status={slider.status} size="sm" />
            </div>
          </div>

          {/* Image Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-2 flex items-center gap-2">
              <ImageIcon size={18} className="text-green-600 dark:text-green-400" />
              Home Slider Image
            </h2>

            {slider.image ? (
              <div className="flex justify-center">
                <img
                  src={slider.image}
                  alt={slider.name}
                  className="max-w-full w-full h-auto rounded-lg border border-gray-200 object-cover"
                />
              </div>
            ) : (
              <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-600">
                <p className="text-sm text-gray-500">No image available</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewHomeSlider;
