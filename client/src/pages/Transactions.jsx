import { useEffect, useState } from "react";
import {
  ChevronRight,
  Pencil,
  Plus,
  Trash2
} from "lucide-react";

import { apiRequest } from "../services/api";
import { formatDate, formatMoney } from "../utils/format";

import PageHeader from "../components/PageHeader";
import Button from "../components/Button";
import Modal from "../components/Modal";
import Loading from "../components/Loading";
import ErrorMessage from "../components/ErrorMessage";
import EmptyState from "../components/EmptyState";

const TYPES = ["INCOME", "EXPENSE"];

function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const [deleting, setDeleting] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [descriptionModal, setDescriptionModal] =
    useState(null);

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [
        transactionData,
        accountData,
        categoryData
      ] = await Promise.all([
        apiRequest("/transactions"),
        apiRequest("/accounts"),
        apiRequest("/categories")
      ]);

      setTransactions(
        Array.isArray(transactionData)
          ? transactionData
          : transactionData.transactions ?? []
      );

      setAccounts(
        Array.isArray(accountData)
          ? accountData
          : accountData.accounts ?? []
      );

      setCategories(
        Array.isArray(categoryData)
          ? categoryData
          : categoryData.categories ?? []
      );
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(transaction) {
    setEditing(transaction);
    setModalOpen(true);
  }

  async function deleteTransaction() {
    if (!deleting) return;

    try {
      setDeleteLoading(true);

      await apiRequest(`/transactions/${deleting.id}`, {
        method: "DELETE"
      });

      setDeleting(null);
      await loadData();
    } catch (error) {
      setError(error.message);
    } finally {
      setDeleteLoading(false);
    }
  }

  async function saveTransaction(form) {
    try {
      setError("");

      const body = {
        accountId: form.accountId,
        categoryId: form.categoryId,
        type: form.type,
        amount: form.amount,
        description: form.description,
        transactionDate: form.transactionDate
      };

      if (editing) {
        await apiRequest(
          `/transactions/${editing.id}`,
          {
            method: "PATCH",
            body: JSON.stringify(body)
          }
        );
      } else {
        await apiRequest("/transactions", {
          method: "POST",
          body: JSON.stringify(body)
        });
      }

      setModalOpen(false);
      await loadData();
    } catch (error) {
      setError(error.message);
    }
  }

  return (
    <div>
      <PageHeader
        title="Transactions"
        description="Track your income and expenses."
        action={
          <Button
            onClick={openCreate}
            className="gap-2"
          >
            <Plus className="h-5 w-5" />
            Add Transaction
          </Button>
        }
      />

      <ErrorMessage message={error} />

      {loading ? (
        <Loading message="Loading transactions..." />
      ) : transactions.length === 0 ? (
        <EmptyState
          message="No transactions yet."
          action={
            <Button onClick={openCreate}>
              Add Transaction
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <div className="w-full overflow-x-auto">
            <table className="min-w-[1050px] w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="whitespace-nowrap px-5 py-4 text-left">
                    Date
                  </th>

                  <th className="px-5 py-4 text-left">
                    Description
                  </th>

                  <th className="whitespace-nowrap px-5 py-4 text-left">
                    Account
                  </th>

                  <th className="whitespace-nowrap px-5 py-4 text-left">
                    Category
                  </th>

                  <th className="whitespace-nowrap px-5 py-4 text-left">
                    Type
                  </th>

                  <th className="whitespace-nowrap px-5 py-4 text-right">
                    Amount
                  </th>

                  <th className="whitespace-nowrap px-5 py-4 text-right">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {transactions.map((transaction) => {
                  const currency =
                    transaction.currencyCode ||
                    transaction.account?.currencyCode ||
                    "INR";

                  return (
                    <tr key={transaction.id}>
                      <td className="whitespace-nowrap px-5 py-4 text-sm">
                        {formatDate(
                          transaction.transactionDate
                        )}
                      </td>

                      <td className="max-w-[260px] px-5 py-4">
                        {transaction.description ? (
                          <div className="flex items-center gap-2">
                            <span className="block truncate">
                              {transaction.description}
                            </span>

                            {transaction.description.length >
                              40 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setDescriptionModal(
                                    transaction.description
                                  )
                                }
                                className="shrink-0 rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                                title="View full description"
                              >
                                <ChevronRight className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4">
                        {transaction.account?.name || "—"}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4">
                        {transaction.category?.name || "—"}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4">
                        <span
                          className={
                            transaction.type === "INCOME"
                              ? "text-green-600"
                              : "text-red-600"
                          }
                        >
                          {transaction.type}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-right font-medium">
                        {formatMoney(
                          transaction.amount,
                          currency
                        )}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4">
                        <div className="flex min-w-max justify-end gap-2">
                          <Button
                            variant="secondary"
                            onClick={() =>
                              openEdit(transaction)
                            }
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="danger"
                            onClick={() =>
                              setDeleting(transaction)
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modalOpen && (
        <TransactionModal
          transaction={editing}
          accounts={accounts}
          categories={categories}
          onClose={() => setModalOpen(false)}
          onSave={saveTransaction}
        />
      )}

      {deleting && (
        <Modal
          title="Delete Transaction"
          onClose={() => {
            if (!deleteLoading) {
              setDeleting(null);
            }
          }}
        >
          <p className="text-sm text-gray-600">
            Are you sure you want to delete this transaction?
            This action cannot be undone.
          </p>

          <div className="mt-6 flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => setDeleting(null)}
              disabled={deleteLoading}
            >
              Cancel
            </Button>

            <Button
              variant="danger"
              onClick={deleteTransaction}
              disabled={deleteLoading}
            >
              {deleteLoading ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </Modal>
      )}

      {descriptionModal && (
        <Modal
          title="Transaction Description"
          onClose={() => setDescriptionModal(null)}
        >
          <div className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap break-words text-sm leading-6 text-gray-700">
            {descriptionModal}
          </div>
        </Modal>
      )}
    </div>
  );
}

function TransactionModal({
  transaction,
  accounts,
  categories,
  onClose,
  onSave
}) {
  const [form, setForm] = useState({
    accountId: transaction?.accountId ?? "",
    categoryId: transaction?.categoryId ?? "",
    type: transaction?.type ?? "EXPENSE",
    amount: transaction?.amount ?? "",
    description: transaction?.description ?? "",
    transactionDate: transaction?.transactionDate
      ? new Date(transaction.transactionDate)
          .toISOString()
          .slice(0, 10)
      : new Date().toISOString().slice(0, 10)
  });

  const [saving, setSaving] = useState(false);

  function update(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  async function submit(event) {
    event.preventDefault();

    setSaving(true);

    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  }

  const filteredCategories = categories.filter(
    (category) => category.type === form.type
  );

  return (
    <Modal
      title={
        transaction
          ? "Edit Transaction"
          : "Add Transaction"
      }
      onClose={onClose}
    >
      <form
        onSubmit={submit}
        className="space-y-4"
      >
        <div>
          <label className="mb-1 block text-sm font-medium">
            Type
          </label>

          <select
            value={form.type}
            onChange={(e) =>
              update("type", e.target.value)
            }
            className="w-full rounded-lg border px-3 py-2"
          >
            {TYPES.map((type) => (
              <option key={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            Account
          </label>

          <select
            value={form.accountId}
            onChange={(e) =>
              update("accountId", e.target.value)
            }
            required
            className="w-full rounded-lg border px-3 py-2"
          >
            <option value="">
              Select account
            </option>

            {accounts.map((account) => (
              <option
                key={account.id}
                value={account.id}
              >
                {account.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            Category
          </label>

          <select
            value={form.categoryId}
            onChange={(e) =>
              update("categoryId", e.target.value)
            }
            required
            className="w-full rounded-lg border px-3 py-2"
          >
            <option value="">
              Select category
            </option>

            {filteredCategories.map((category) => (
              <option
                key={category.id}
                value={category.id}
              >
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            Amount
          </label>

          <input
            type="number"
            step="0.0001"
            min="0.0001"
            value={form.amount}
            onChange={(e) =>
              update("amount", e.target.value)
            }
            required
            className="w-full rounded-lg border px-3 py-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            Description
          </label>

          <input
            value={form.description}
            onChange={(e) =>
              update(
                "description",
                e.target.value
              )
            }
            className="w-full rounded-lg border px-3 py-2"
            placeholder="Groceries"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            Date
          </label>

          <input
            type="date"
            value={form.transactionDate}
            onChange={(e) =>
              update(
                "transactionDate",
                e.target.value
              )
            }
            required
            className="w-full rounded-lg border px-3 py-2"
          />
        </div>

        <div className="flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={onClose}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default Transactions;