import { useLocation } from "react-router-dom";
import { Construction, Home } from "lucide-react";
import { Link } from "react-router-dom";

const UnderDevelopment = () => {
  const location = useLocation();

  // Extract page name from path
  const getPageName = () => {
    const path = location.pathname;
    const segments = path.split("/").filter(Boolean);

    if (segments.length === 0) return "Page";

    // Convert path segments to readable format
    const pageName = segments
      .map((segment) => {
        // Replace hyphens with spaces and capitalize
        return segment
          .split("-")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
      })
      .join(" > ");

    return pageName;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-yellow-100 dark:bg-yellow-900/20 p-6">
            <Construction className="w-16 h-16 text-yellow-600 dark:text-yellow-400" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
          Under Development
        </h1>

        {/* Description */}
        <p className="text-gray-600 dark:text-gray-400 mb-2">
          The page{" "}
          <span className="font-semibold text-gray-900 dark:text-gray-200">
            "{getPageName()}"
          </span>{" "}
          is currently under development.
        </p>
        <p className="text-gray-500 dark:text-gray-500 mb-8">
          We're working hard to bring you this feature soon. Please check back
          later.
        </p>

        {/* Back Button */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
        >
          <Home className="w-5 h-5" />
          <span>Go to Dashboard</span>
        </Link>
      </div>
    </div>
  );
};

export default UnderDevelopment;
