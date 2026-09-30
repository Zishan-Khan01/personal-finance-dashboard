import { useEffect, useState } from "react";
import {
  ChevronRight,
  Pencil,
  Plus,
  Trash2
} from "lucide-react";

import { apiRequest } from "../services/api";
import { formatMoney } from "../utils/format";

import PageHeader from "../components/PageHeader";
import Button from "../components/Button";
import Modal from "../components/Modal";
import Loading from "../components/Loading";
import ErrorMessage from "../components/ErrorMessage";
import EmptyState from "../components/EmptyState";

const FREQUENCIES = [
  "DAILY",
  "WEEKLY",
  "MONTHLY",
  "YEARLY"
];

function RecurringTransactions() {
  const [items, setItems] = useState([]);
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

      const [
        recurringData,
        accountData,
        categoryData
      ] = await Promise.all([
        apiRequest("/recurring"),
        apiRequest("/accounts"),
        apiRequest("/categories")
      ]);

      setItems(
        Array.isArray(recurringData)
          ? recurringData
          : recurringData.recurringTransactions ??
              []
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

  async function deleteItem() {
    if (!deleting) return;

    try {
      setDeleteLoading(true);

      await apiRequest(`/recurring/${deleting.id}`, {
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

  async function saveItem(form) {
    try {
      setError("");

      const selectedAccount = accounts.find(
        (account) => account.id === form.accountId
      );

      if (!selectedAccount) {
        throw new Error(
          "Please select a valid account"
        );
      }

      const body = {
        accountId: form.accountId,
        categoryId: form.categoryId,
        type: form.type,
        amount: form.amount,
        currencyCode:
          selectedAccount.currencyCode,
        description: form.description,
        frequency: form.frequency,
        startDate: form.startDate,
        nextRunDate: form.startDate
      };

      if (editing) {
        await apiRequest(
          `/recurring/${editing.id}`,
          {
            method: "PATCH",
            body: JSON.stringify(body)
          }
        );
      } else {
        await apiRequest("/recurring", {
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
        title="Recurring Transactions"
        description="Manage automatically scheduled transactions."
        action={
          <Button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
            className="gap-2"
          >
            <Plus className="h-5 w-5" />
            Add Recurring
          </Button>
        }
      />

      <ErrorMessage message={error} />

      {loading ? (
        <Loading />
      ) : items.length === 0 ? (
        <EmptyState
          message="No recurring transactions yet."
          action={
            <Button
              onClick={() => {
                setEditing(null);
                setModalOpen(true);
              }}
            >
              Add Recurring Transaction
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <div className="w-full overflow-x-auto">
            <table className="min-w-[950px] w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-4 text-left">
                    Description
                  </th>

                  <th className="whitespace-nowrap px-5 py-4 text-left">
                    Type
                  </th>

                  <th className="whitespace-nowrap px-5 py-4 text-left">
                    Frequency
                  </th>

                  <th className="whitespace-nowrap px-5 py-4 text-left">
                    Account
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
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="max-w-[260px] px-5 py-4">
                      {item.description ? (
                        <div className="flex items-center gap-2">
                          <span className="block truncate">
                            {item.description}
                          </span>

                          {item.description.length >
                            40 && (
                            <button
                              type="button"
                              onClick={() =>
                                setDescriptionModal(
                                  item.description
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
                      {item.type}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4">
                      {item.frequency}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4">
                      {item.account?.name || "—"}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-right">
                      {formatMoney(
                        item.amount,
                        item.currencyCode ||
                          item.account?.currencyCode ||
                          "INR"
                      )}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4">
                      <div className="flex min-w-max justify-end gap-2">
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setEditing(item);
                            setModalOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="danger"
                          onClick={() =>
                            setDeleting(item)
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modalOpen && (
        <RecurringModal
          item={editing}
          accounts={accounts}
          categories={categories}
          onClose={() => setModalOpen(false)}
          onSave={saveItem}
        />
      )}

      {deleting && (
        <Modal
          title="Delete Recurring Transaction"
          onClose={() => {
            if (!deleteLoading) {
              setDeleting(null);
            }
          }}
        >
          <p className="text-sm text-gray-600">
            Are you sure you want to delete this recurring
            transaction? This action cannot be undone.
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
              onClick={deleteItem}
              disabled={deleteLoading}
            >
              {deleteLoading
                ? "Deleting..."
                : "Delete"}
            </Button>
          </div>
        </Modal>
      )}

      {descriptionModal && (
        <Modal
          title="Recurring Transaction Description"
          onClose={() =>
            setDescriptionModal(null)
          }
        >
          <div className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap break-words text-sm leading-6 text-gray-700">
            {descriptionModal}
          </div>
        </Modal>
      )}
    </div>
  );
}

function RecurringModal({
  item,
  accounts,
  categories,
  onClose,
  onSave
}) {
  const [form, setForm] = useState({
    accountId: item?.accountId ?? "",
    categoryId: item?.categoryId ?? "",
    type: item?.type ?? "EXPENSE",
    amount: item?.amount ?? "",
    description: item?.description ?? "",
    frequency: item?.frequency ?? "MONTHLY",
    startDate: item?.startDate
      ? new Date(item.startDate)
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
        item
          ? "Edit Recurring Transaction"
          : "Add Recurring Transaction"
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
            <option value="EXPENSE">
              EXPENSE
            </option>

            <option value="INCOME">
              INCOME
            </option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            Account
          </label>

          <select
            value={form.accountId}
            onChange={(e) =>
              update(
                "accountId",
                e.target.value
              )
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
              update(
                "categoryId",
                e.target.value
              )
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
            min="0.0001"
            step="0.0001"
            value={form.amount}
            onChange={(e) =>
              update("amount", e.target.value)
            }
            required
            placeholder="Amount"
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
            placeholder="Description"
            className="w-full rounded-lg border px-3 py-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            Frequency
          </label>

          <select
            value={form.frequency}
            onChange={(e) =>
              update(
                "frequency",
                e.target.value
              )
            }
            className="w-full rounded-lg border px-3 py-2"
          >
            {FREQUENCIES.map((frequency) => (
              <option
                key={frequency}
                value={frequency}
              >
                {frequency}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            Start Date
          </label>

          <input
            type="date"
            value={form.startDate}
            onChange={(e) =>
              update(
                "startDate",
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

export default RecurringTransactions;