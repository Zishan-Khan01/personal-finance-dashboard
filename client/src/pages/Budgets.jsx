import { useEffect, useState } from "react";
import {
  Pencil,
  Plus,
  Trash2
} from "lucide-react";

import { apiRequest } from "../services/api";
import {
  formatMoney,
  formatPercentage
} from "../utils/format";

import PageHeader from "../components/PageHeader";
import Button from "../components/Button";
import Modal from "../components/Modal";
import Loading from "../components/Loading";
import ErrorMessage from "../components/ErrorMessage";
import EmptyState from "../components/EmptyState";

function formatBudgetDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();

  return `${day}-${month}-${year}`;
}

function toDateInputValue(value) {
  if (!value) {
    return new Date().toISOString().slice(0, 10);
  }

  return String(value).slice(0, 10);
}

function Budgets() {
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const [deleting, setDeleting] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function loadData() {
    try {
      setLoading(true);

      const [budgetData, categoryData] =
        await Promise.all([
          apiRequest("/budgets"),
          apiRequest("/categories")
        ]);

      setBudgets(
        Array.isArray(budgetData)
          ? budgetData
          : budgetData.budgets ?? []
      );

      const allCategories =
        Array.isArray(categoryData)
          ? categoryData
          : categoryData.categories ?? [];

      setCategories(
        allCategories.filter(
          (category) =>
            category.type === "EXPENSE"
        )
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

  async function deleteBudget() {
    if (!deleting) return;

    try {
      setDeleteLoading(true);

      await apiRequest(`/budgets/${deleting.id}`, {
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

  async function saveBudget(form) {
    const body = {
      categoryId: form.categoryId,
      amount: form.amount,
      currencyCode: form.currencyCode,
      startDate: form.startDate,
      endDate: form.endDate
    };

    if (editing) {
      await apiRequest(
        `/budgets/${editing.id}`,
        {
          method: "PATCH",
          body: JSON.stringify(body)
        }
      );
    } else {
      await apiRequest("/budgets", {
        method: "POST",
        body: JSON.stringify(body)
      });
    }

    setModalOpen(false);
    await loadData();
  }

  return (
    <div>
      <PageHeader
        title="Budgets"
        description="Set spending limits and monitor your progress."
        action={
          <Button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
            className="gap-2"
          >
            <Plus className="h-5 w-5" />
            Add Budget
          </Button>
        }
      />

      <ErrorMessage message={error} />

      {loading ? (
        <Loading />
      ) : budgets.length === 0 ? (
        <EmptyState
          message="No budgets created yet."
          action={
            <Button
              onClick={() => {
                setEditing(null);
                setModalOpen(true);
              }}
            >
              Create Budget
            </Button>
          }
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {budgets.map((budget) => {
            const percentage = Number(
              budget.percentage ?? 0
            );

            return (
              <div
                key={budget.id}
                className="min-w-0 rounded-xl border bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="break-words font-semibold">
                      {budget.category?.name ||
                        budget.categoryName ||
                        "Budget"}
                    </h3>

                    <p className="mt-1 text-sm text-gray-500">
                      {formatBudgetDate(budget.startDate)}
                      {" → "}
                      {formatBudgetDate(budget.endDate)}
                    </p>
                  </div>

                  <div className="flex shrink-0 gap-1 self-end sm:self-auto">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setEditing(budget);
                        setModalOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="danger"
                      onClick={() =>
                        setDeleting(budget)
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="flex flex-wrap justify-between gap-2 text-sm">
                    <span>
                      Spent:{" "}
                      {formatMoney(
                        budget.spent,
                        budget.currencyCode
                      )}
                    </span>

                    <span>
                      {formatPercentage(percentage)}
                    </span>
                  </div>

                  <div className="mt-2 h-3 overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full rounded-full bg-blue-600"
                      style={{
                        width: `${Math.min(
                          percentage,
                          100
                        )}%`
                      }}
                    />
                  </div>

                  <div className="mt-3 flex flex-wrap justify-between gap-2 text-sm">
                    <span className="text-gray-500">
                      Budget
                    </span>

                    <span className="font-semibold">
                      {formatMoney(
                        budget.amount,
                        budget.currencyCode
                      )}
                    </span>
                  </div>

                  <div className="mt-1 flex flex-wrap justify-between gap-2 text-sm">
                    <span className="text-gray-500">
                      Remaining
                    </span>

                    <span className="font-semibold">
                      {formatMoney(
                        budget.remaining,
                        budget.currencyCode
                      )}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <BudgetModal
          budget={editing}
          categories={categories}
          onClose={() => setModalOpen(false)}
          onSave={saveBudget}
        />
      )}

      {deleting && (
        <Modal
          title="Delete Budget"
          onClose={() => {
            if (!deleteLoading) {
              setDeleting(null);
            }
          }}
        >
          <p className="text-sm text-gray-600">
            Are you sure you want to delete this budget?
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
              onClick={deleteBudget}
              disabled={deleteLoading}
            >
              {deleteLoading ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function BudgetModal({
  budget,
  categories,
  onClose,
  onSave
}) {
  const [form, setForm] = useState({
    categoryId: budget?.categoryId ?? "",
    amount: budget?.amount ?? "",
    currencyCode:
      budget?.currencyCode ?? "INR",
    startDate: toDateInputValue(
      budget?.startDate
    ),
    endDate: toDateInputValue(
      budget?.endDate
    )
  });

  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  function update(field, value) {
    setModalError("");

    setForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  async function submit(event) {
    event.preventDefault();

    setModalError("");

    if (form.endDate <= form.startDate) {
      setModalError(
        "End date must be after start date."
      );
      return;
    }

    setSaving(true);

    try {
      await onSave(form);
    } catch (error) {
      setModalError(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={budget ? "Edit Budget" : "Add Budget"}
      onClose={onClose}
    >
      <form
        onSubmit={submit}
        className="space-y-4"
      >
        {modalError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {modalError}
          </div>
        )}

        <select
          value={form.categoryId}
          onChange={(e) =>
            update("categoryId", e.target.value)
          }
          required
          className="w-full rounded-lg border px-3 py-2"
        >
          <option value="">
            Select expense category
          </option>

          {categories.map((category) => (
            <option
              key={category.id}
              value={category.id}
            >
              {category.name}
            </option>
          ))}
        </select>

        <input
          type="number"
          min="0.0001"
          step="0.0001"
          value={form.amount}
          onChange={(e) =>
            update("amount", e.target.value)
          }
          required
          placeholder="Budget amount"
          className="w-full rounded-lg border px-3 py-2"
        />

        <input
          value={form.currencyCode}
          onChange={(e) =>
            update(
              "currencyCode",
              e.target.value.toUpperCase()
            )
          }
          maxLength={3}
          required
          className="w-full rounded-lg border px-3 py-2"
        />

        <div>
          <label className="mb-1 block text-sm font-medium">
            Start Date
          </label>

          <input
            type="date"
            value={form.startDate}
            onChange={(e) =>
              update("startDate", e.target.value)
            }
            required
            className="w-full rounded-lg border px-3 py-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            End Date
          </label>

          <input
            type="date"
            value={form.endDate}
            onChange={(e) =>
              update("endDate", e.target.value)
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

          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default Budgets;