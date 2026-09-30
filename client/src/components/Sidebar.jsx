import {
  LayoutDashboard,
  WalletCards,
  Receipt,
  ArrowLeftRight,
  PiggyBank,
  Target,
  Repeat,
  X
} from "lucide-react";

import {
  NavLink,
  useLocation
} from "react-router-dom";

import { useEffect } from "react";

const links = [
  {
    path: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard
  },
  {
    path: "/accounts",
    label: "Accounts",
    icon: WalletCards
  },
  {
    path: "/transactions",
    label: "Transactions",
    icon: Receipt
  },
  {
    path: "/transfers",
    label: "Transfers",
    icon: ArrowLeftRight
  },
  {
    path: "/budgets",
    label: "Budgets",
    icon: PiggyBank
  },
  {
    path: "/savings-goals",
    label: "Savings Goals",
    icon: Target
  },
  {
    path: "/recurring",
    label: "Recurring",
    icon: Repeat
  }
];

function SidebarLinks({ onNavigate }) {
  return (
    <nav className="space-y-2">
      {links.map((link) => {
        const Icon = link.icon;

        return (
          <NavLink
            key={link.path}
            to={link.path}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-4 rounded-lg px-4 py-3 text-sm font-medium transition ${
                isActive
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`
            }
          >
            <Icon className="h-6 w-6 shrink-0" />

            <span>{link.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

function Sidebar({
  mobileOpen = false,
  onMobileClose
}) {
  const location = useLocation();

  useEffect(() => {
    if (mobileOpen && onMobileClose) {
      onMobileClose();
    }
  }, [
    location.pathname,
    mobileOpen,
    onMobileClose
  ]);

  useEffect(() => {
    if (!mobileOpen) {
      return undefined;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, [mobileOpen]);

  return (
    <>
      <aside className="hidden min-h-[calc(100vh-4rem)] w-64 shrink-0 border-r border-gray-200 bg-white p-4 lg:block">
        <SidebarLinks />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close sidebar"
            onClick={onMobileClose}
            className="absolute inset-0 bg-black/40"
          />

          <aside className="relative z-10 flex h-full w-72 max-w-[85vw] flex-col border-r border-gray-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-4">
              <span className="text-lg font-semibold text-gray-900">
                Menu
              </span>

              <button
                type="button"
                onClick={onMobileClose}
                className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <SidebarLinks
                onNavigate={onMobileClose}
              />
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

export default Sidebar;