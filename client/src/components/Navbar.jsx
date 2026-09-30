import { LogOut, Wallet } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Button from "./Button";

function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6 shadow-sm">
      <div className="flex items-center gap-3">
        <Wallet className="h-7 w-7 text-blue-600" />

        <h2 className="text-lg font-bold text-gray-900">
          Personal Finance
        </h2>
      </div>

      <div className="flex items-center gap-4">
        <span className="hidden text-sm text-gray-600 sm:block">
          {user?.name}
        </span>

        <Button
          variant="secondary"
          onClick={logout}
          className="gap-2"
        >
          <LogOut className="h-5 w-5" />
          Logout
        </Button>
      </div>
    </header>
  );
}

export default Navbar;