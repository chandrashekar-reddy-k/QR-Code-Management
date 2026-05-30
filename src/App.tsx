import { useState, Suspense } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "./redux/store";

import Sidebar from "./components/layout/Sidebar";
import Header from "./components/layout/Header";
import LoadingFallback from "./components/common/LoadingFallback";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { publicRoutes, protectedRoutes } from "./routes";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ToastContainer } from "react-toastify";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('token');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900 overflow-x-hidden relative">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className="flex-1 md:ml-72 min-w-0 overflow-x-hidden h-screen overflow-y-auto">
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main className="p-2 md:p-4 overflow-x-hidden">
          <ErrorBoundary>
            <Suspense fallback={<LoadingFallback />}>{children}</Suspense>
          </ErrorBoundary>
        </main>
      </div>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

// Single function to render routes
const renderRoutes = () => {
  return (
    <>
      {/* Public routes */}
      {publicRoutes.map((route) => {
        const Component = route.component;
        return (
          <Route
            key={route.path}
            path={route.path}
            element={
              <ErrorBoundary>
                <Suspense fallback={<LoadingFallback />}>
                  <Component />
                </Suspense>
              </ErrorBoundary>
            }
          />
        );
      })}

      {/* Protected routes */}
      {protectedRoutes.map((route) => {
        const Component = route.component;
        return (
          <Route
            key={route.path}
            path={route.path}
            element={
              <ProtectedRoute>
                <Component />
              </ProtectedRoute>
            }
          />
        );
      })}

      {/* Catch-all route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </>
  );
};

// Create QueryClient outside component to avoid recreation on every render
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <Provider store={store}>
          <Router>
            <Routes>{renderRoutes()}</Routes>
          </Router>
          <ToastContainer />
        </Provider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
