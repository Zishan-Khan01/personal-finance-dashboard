import { useEffect, useState } from "react";
import {
  Plus,
  Pencil,
  Archive,
  RotateCcw,
  X,
  Wallet,
  Building2,
  Banknote,
  CreditCard,
  TrendingUp,
  MoreHorizontal,
  AlertTriangle
} from "lucide-react";

import { api } from "../lib/api";
import PageHeader from "../components/PageHeader";

const ACCOUNT_TYPES = [
  "BANK",
  "CASH",
  "CREDIT_CARD",
  "WALLET",
  "INVESTMENT",
  "OTHER"
];

const ACCOUNT_TYPE_LABELS = {
  BANK: "Bank",
  CASH: "Cash",
  CREDIT_CARD: "Credit Card",
  WALLET: "Wallet",
  INVESTMENT: "Investment",
  OTHER: "Other"
};

const ACCOUNT_TYPE_ICONS = {
  BANK: Building2,
  CASH: Banknote,
  CREDIT_CARD: CreditCard,
  WALLET: Wallet,
  INVESTMENT: TrendingUp,
  OTHER: MoreHorizontal
};

function formatBalance(balance) {
  const number = Number(balance || 0);

  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(number);
}

function Modal({ children, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ title, onClose }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
      <h2 className="text-lg font-semibold text-gray-900">
        {title}
      </h2>

      <button
        type="button"
        onClick={onClose}
        className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}

export default function Accounts() {
  const [accounts, setAccounts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState("active");

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [confirmation, setConfirmation] = useState(null);

  const [form, setForm] = useState({
    name: "",
    type: "BANK",
    currencyCode: "INR",
    openingBalance: "0"
  });

  const [saving, setSaving] = useState(false);

  async function loadAccounts() {
    try {
      setLoading(true);
      setError("");

      const data = await api("/accounts");

      setAccounts(data);
    } catch (err) {
      setError(err.message || "Failed to load accounts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAccounts();
  }, []);

  function resetForm() {
    setForm({
      name: "",
      type: "BANK",
      currencyCode: "INR",
      openingBalance: "0"
    });
  }

  function openAddModal() {
    resetForm();
    setError("");
    setShowAddModal(true);
  }

  function closeAddModal() {
    if (!saving) {
      setShowAddModal(false);
      resetForm();
    }
  }

  function openEditModal(account) {
    setError("");
    setEditingAccount(account);

    setForm({
      name: account.name || "",
      type: account.type || "BANK",
      currencyCode: account.currencyCode || "INR",
      openingBalance: String(
        account.openingBalance ?? "0"
      )
    });
  }

  function closeEditModal() {
    if (!saving) {
      setEditingAccount(null);
      resetForm();
    }
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]:
        name === "currencyCode"
          ? value.toUpperCase()
          : value
    }));
  }

  async function handleCreateAccount(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");

      await api("/accounts", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          type: form.type,
          currencyCode: form.currencyCode,
          openingBalance: form.openingBalance
        })
      });

      setShowAddModal(false);
      resetForm();

      await loadAccounts();
    } catch (err) {
      setError(
        err.message || "Failed to create account"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateAccount(event) {
    event.preventDefault();

    if (!editingAccount) return;

    try {
      setSaving(true);
      setError("");

      await api(`/accounts/${editingAccount.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: form.name,
          type: form.type,
          currencyCode: form.currencyCode,
          openingBalance: form.openingBalance
        })
      });

      setEditingAccount(null);
      resetForm();

      await loadAccounts();
    } catch (err) {
      setError(
        err.message || "Failed to update account"
      );
    } finally {
      setSaving(false);
    }
  }

  function openDeactivateModal(account) {
    setConfirmation({
      action: "deactivate",
      account
    });
  }

  function openRestoreModal(account) {
    setConfirmation({
      action: "restore",
      account
    });
  }

  function closeConfirmationModal() {
    if (!saving) {
      setConfirmation(null);
    }
  }

  async function confirmAccountStatusChange() {
    if (!confirmation?.account) return;

    const account = confirmation.account;
    const action = confirmation.action;

    try {
      setSaving(true);
      setError("");

      await api(`/accounts/${account.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          isActive: action === "restore"
        })
      });

      setConfirmation(null);

      await loadAccounts();
    } catch (err) {
      setError(
        err.message ||
          `Failed to ${
            action === "restore"
              ? "restore"
              : "deactivate"
          } account`
      );
    } finally {
      setSaving(false);
    }
  }

  const activeAccounts = accounts.filter(
    (account) => account.isActive !== false
  );

  const archivedAccounts = accounts.filter(
    (account) => account.isActive === false
  );

  const displayedAccounts =
    activeTab === "active"
      ? activeAccounts
      : archivedAccounts;

  function renderAccountCard(account) {
    const Icon =
      ACCOUNT_TYPE_ICONS[account.type] ||
      MoreHorizontal;

    const isActive =
      account.isActive !== false;

    return (
      <div
        key={account.id}
        className={`rounded-2xl border bg-white p-5 shadow-sm transition ${
          isActive
            ? "border-gray-200 hover:shadow-md"
            : "border-gray-200 opacity-80"
        }`}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                isActive
                  ? "bg-gray-100 text-gray-700"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              <Icon className="h-5 w-5" />
            </div>

            <div>
              <h3 className="font-semibold text-gray-900">
                {account.name}
              </h3>

              <p className="text-sm text-gray-500">
                {ACCOUNT_TYPE_LABELS[
                  account.type
                ] || account.type}
              </p>
            </div>
          </div>

          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              isActive
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {isActive ? "Active" : "Archived"}
          </span>
        </div>

        <div className="mt-6">
          <p className="text-sm text-gray-500">
            Balance
          </p>

          <p className="mt-1 text-2xl font-bold text-gray-900">
            {account.currencyCode}{" "}
            {formatBalance(
              account.openingBalance
            )}
          </p>
        </div>

        <div className="mt-5 flex gap-2 border-t border-gray-100 pt-4">
          <button
            type="button"
            onClick={() =>
              openEditModal(account)
            }
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            <Pencil className="h-4 w-4" />
            Edit
          </button>

          {isActive ? (
            <button
              type="button"
              onClick={() =>
                openDeactivateModal(account)
              }
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-orange-200 px-3 py-2 text-sm font-medium text-orange-600 transition hover:bg-orange-50"
            >
              <Archive className="h-4 w-4" />
              Deactivate
            </button>
          ) : (
            <button
              type="button"
              onClick={() =>
                openRestoreModal(account)
              }
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-green-200 px-3 py-2 text-sm font-medium text-green-600 transition hover:bg-green-50"
            >
              <RotateCcw className="h-4 w-4" />
              Restore
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Accounts"
        description="Manage your financial accounts."
        action={
          <button
            type="button"
            onClick={openAddModal}
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            <Plus className="h-5 w-5" />
            Add Account
          </button>
        }
      />

      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mb-6 flex rounded-xl border border-gray-200 bg-white p-1">
        <button
          type="button"
          onClick={() =>
            setActiveTab("active")
          }
          className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
            activeTab === "active"
              ? "bg-gray-900 text-white"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          Active Accounts (
          {activeAccounts.length})
        </button>

        <button
          type="button"
          onClick={() =>
            setActiveTab("archived")
          }
          className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
            activeTab === "archived"
              ? "bg-gray-900 text-white"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          Archived Accounts (
          {archivedAccounts.length})
        </button>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
          <p className="text-sm text-gray-500">
            Loading accounts...
          </p>
        </div>
      ) : displayedAccounts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <Wallet className="mx-auto h-10 w-10 text-gray-300" />

          <h3 className="mt-4 font-semibold text-gray-900">
            {activeTab === "active"
              ? "No active accounts"
              : "No archived accounts"}
          </h3>

          <p className="mt-1 text-sm text-gray-500">
            {activeTab === "active"
              ? "Create an account to start tracking your finances."
              : "Deactivated accounts will appear here."}
          </p>

          {activeTab === "active" && (
            <button
              type="button"
              onClick={openAddModal}
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Add Account
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {displayedAccounts.map(
            renderAccountCard
          )}
        </div>
      )}

      {showAddModal && (
        <Modal onClose={closeAddModal}>
          <ModalHeader
            title="Add Account"
            onClose={closeAddModal}
          />

          <form
            onSubmit={handleCreateAccount}
            className="space-y-5 p-6"
          >
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Account Name
              </label>

              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. HDFC Bank"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Account Type
              </label>

              <select
                name="type"
                value={form.type}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
              >
                {ACCOUNT_TYPES.map(
                  (type) => (
                    <option
                      key={type}
                      value={type}
                    >
                      {
                        ACCOUNT_TYPE_LABELS[
                          type
                        ]
                      }
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Currency
              </label>

              <input
                type="text"
                name="currencyCode"
                value={form.currencyCode}
                onChange={handleChange}
                maxLength={3}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm uppercase outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Opening Balance
              </label>

              <input
                type="number"
                name="openingBalance"
                value={form.openingBalance}
                onChange={handleChange}
                step="0.0001"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
              />
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-100 pt-5">
              <button
                type="button"
                onClick={closeAddModal}
                disabled={saving}
                className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Creating..."
                  : "Create Account"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {editingAccount && (
        <Modal onClose={closeEditModal}>
          <ModalHeader
            title="Edit Account"
            onClose={closeEditModal}
          />

          <form
            onSubmit={handleUpdateAccount}
            className="space-y-5 p-6"
          >
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Account Name
              </label>

              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Account Type
              </label>

              <select
                name="type"
                value={form.type}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
              >
                {ACCOUNT_TYPES.map(
                  (type) => (
                    <option
                      key={type}
                      value={type}
                    >
                      {
                        ACCOUNT_TYPE_LABELS[
                          type
                        ]
                      }
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Currency
              </label>

              <input
                type="text"
                name="currencyCode"
                value={form.currencyCode}
                onChange={handleChange}
                maxLength={3}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm uppercase outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Balance
              </label>

              <input
                type="number"
                name="openingBalance"
                value={form.openingBalance}
                onChange={handleChange}
                step="0.0001"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
              />
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-100 pt-5">
              <button
                type="button"
                onClick={closeEditModal}
                disabled={saving}
                className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : "Save Changes"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {confirmation && (
        <Modal
          onClose={
            closeConfirmationModal
          }
        >
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                  confirmation.action ===
                  "deactivate"
                    ? "bg-orange-100 text-orange-600"
                    : "bg-green-100 text-green-600"
                }`}
              >
                {confirmation.action ===
                "deactivate" ? (
                  <Archive className="h-5 w-5" />
                ) : (
                  <RotateCcw className="h-5 w-5" />
                )}
              </div>

              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-900">
                  {confirmation.action ===
                  "deactivate"
                    ? "Deactivate Account?"
                    : "Restore Account?"}
                </h2>

                <p className="mt-2 text-sm leading-6 text-gray-600">
                  {confirmation.action ===
                  "deactivate"
                    ? `Are you sure you want to deactivate "${confirmation.account.name}"? The account will be moved to Archived Accounts. Its transactions and financial history will remain preserved.`
                    : `Are you sure you want to restore "${confirmation.account.name}"? The account will become active again and appear under Active Accounts.`}
                </p>
              </div>
            </div>

            {confirmation.action ===
              "deactivate" && (
              <div className="mt-5 flex gap-3 rounded-xl border border-orange-200 bg-orange-50 p-4">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" />

                <p className="text-sm leading-5 text-orange-700">
                  Deactivating the
                  account does not delete
                  it or remove its
                  financial history.
                </p>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={
                  closeConfirmationModal
                }
                disabled={saving}
                className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  confirmAccountStatusChange
                }
                disabled={saving}
                className={`rounded-lg px-4 py-2.5 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  confirmation.action ===
                  "deactivate"
                    ? "bg-orange-600 hover:bg-orange-700"
                    : "bg-green-600 hover:bg-green-700"
                }`}
              >
                {saving
                  ? confirmation.action ===
                    "deactivate"
                    ? "Deactivating..."
                    : "Restoring..."
                  : confirmation.action ===
                    "deactivate"
                  ? "Deactivate Account"
                  : "Restore Account"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}