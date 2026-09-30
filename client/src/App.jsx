import { useState } from "react";

import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet
} from "react-router-dom";

import { Menu } from "lucide-react";

import Login from "./pages/Login";
import Register from "./pages/Register";

import Dashboard from "./pages/Dashboard";
import Accounts from "./pages/Accounts";
import Transactions from "./pages/Transactions";
import Transfers from "./pages/Transfers";
import Budgets from "./pages/Budgets";
import SavingsGoals from "./pages/SavingsGoals";
import RecurringTransactions from "./pages/RecurringTransactions";

import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";

function AppLayout() {
  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />

      <div className="flex min-h-[calc(100vh-4rem)]">
        <Sidebar
          mobileOpen={sidebarOpen}
          onMobileClose={() =>
            setSidebarOpen(false)
          }
        />

        <div className="min-w-0 flex-1">
          <div className="border-b border-gray-200 bg-white px-4 py-3 lg:hidden">
            <button
              type="button"
              onClick={() =>
                setSidebarOpen(true)
              }
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
            >
              <Menu className="h-5 w-5" />
              Menu
            </button>
          </div>

          <main className="min-w-0 p-4 sm:p-5 lg:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/register"
          element={<Register />}
        />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route
              path="/dashboard"
              element={<Dashboard />}
            />

            <Route
              path="/accounts"
              element={<Accounts />}
            />

            <Route
              path="/transactions"
              element={<Transactions />}
            />

            <Route
              path="/transfers"
              element={<Transfers />}
            />

            <Route
              path="/budgets"
              element={<Budgets />}
            />

            <Route
              path="/savings-goals"
              element={<SavingsGoals />}
            />

            <Route
              path="/recurring"
              element={
                <RecurringTransactions />
              }
            />
          </Route>
        </Route>

        <Route
          path="/"
          element={
            <Navigate
              to="/dashboard"
              replace
            />
          }
        />

        <Route
          path="*"
          element={
            <Navigate
              to="/dashboard"
              replace
            />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;