import { useEffect, useState } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Wallet,
  PiggyBank
} from "lucide-react";

import { apiRequest } from "../services/api";
import { formatMoney } from "../utils/format";

import { useAuth } from "../context/AuthContext";

import Card from "../components/Card";
import StatCard from "../components/StatCard";
import Loading from "../components/Loading";
import ErrorMessage from "../components/ErrorMessage";

function Dashboard() {
  const { user } = useAuth();

  const [dashboard, setDashboard] =
    useState(null);

  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      try {
        const month = new Date()
          .toISOString()
          .slice(0, 7);

        const data = await apiRequest(
          `/dashboard?month=${month}`
        );

        setDashboard(data);
      } catch (error) {
        setError(error.message);
      }
    }

    loadDashboard();
  }, []);

  if (error) {
    return (
      <div>
        <h1 className="mb-2 text-2xl font-bold">
          Dashboard
        </h1>

        <ErrorMessage message={error} />
      </div>
    );
  }

  if (!dashboard) {
    return <Loading message="Loading dashboard..." />;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">
          Dashboard
        </h1>

        <p className="mt-1 text-gray-500">
          Welcome back, {user?.name}
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Income"
          value={formatMoney(
            dashboard.summary?.totalIncome
          )}
          icon={
            <ArrowUpCircle className="h-6 w-6" />
          }
        />

        <StatCard
          title="Total Expenses"
          value={formatMoney(
            dashboard.summary?.totalExpenses
          )}
          icon={
            <ArrowDownCircle className="h-6 w-6" />
          }
        />

        <StatCard
          title="Net Savings"
          value={formatMoney(
            dashboard.summary?.netSavings
          )}
          icon={
            <PiggyBank className="h-6 w-6" />
          }
        />

        <StatCard
          title="Accounts"
          value={
            dashboard.accounts?.length ?? 0
          }
          icon={
            <Wallet className="h-6 w-6" />
          }
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold">
            Expenses by Category
          </h2>

          <div className="mt-4 space-y-3">
            {dashboard.expensesByCategory
              ?.length ? (
              dashboard.expensesByCategory.map(
                (item) => (
                  <div
                    key={item.category}
                    className="flex justify-between border-b pb-3"
                  >
                    <span>
                      {item.category}
                    </span>

                    <span className="font-semibold">
                      {formatMoney(item.amount)}
                    </span>
                  </div>
                )
              )
            ) : (
              <p className="text-gray-500">
                No expenses found.
              </p>
            )}
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold">
            Accounts
          </h2>

          <div className="mt-4 space-y-3">
            {dashboard.accounts?.length ? (
              dashboard.accounts.map(
                (account) => (
                  <div
                    key={account.id}
                    className="flex justify-between border-b pb-3"
                  >
                    <div>
                      <p className="font-medium">
                        {account.name}
                      </p>

                      <p className="text-sm text-gray-500">
                        {account.type}
                      </p>
                    </div>

                    <span className="font-semibold">
                      {formatMoney(
                        account.openingBalance,
                        account.currencyCode
                      )}
                    </span>
                  </div>
                )
              )
            ) : (
              <p className="text-gray-500">
                No accounts found.
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

export default Dashboard;