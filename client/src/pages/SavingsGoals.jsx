import { useEffect, useState } from "react";
import {
  CheckCircle2,
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

function SavingsGoals() {
  const [goals, setGoals] = useState([]);
  const [transactions, setTransactions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [contributionGoal, setContributionGoal] =
    useState(null);
  const [editing, setEditing] = useState(null);

  const [deleting, setDeleting] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function loadGoals() {
    try {
      setLoading(true);
      setError("");

      const data = await apiRequest(
        "/savings-goals"
      );

      setGoals(
        Array.isArray(data)
          ? data
          : data.savingsGoals ?? []
      );
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadTransactions() {
    try {
      const data = await apiRequest(
        "/transactions"
      );

      setTransactions(
        Array.isArray(data)
          ? data
          : data.transactions ?? []
      );
    } catch (error) {
      setError(error.message);
    }
  }

  useEffect(() => {
    loadGoals();
    loadTransactions();
  }, []);

  async function deleteGoal() {
    if (!deleting) return;

    try {
      setDeleteLoading(true);

      await apiRequest(
        `/savings-goals/${deleting.id}`,
        {
          method: "DELETE"
        }
      );

      setDeleting(null);
      await loadGoals();
    } catch (error) {
      setError(error.message);
    } finally {
      setDeleteLoading(false);
    }
  }

  async function saveGoal(form) {
    const body = {
      name: form.name,
      targetAmount: form.targetAmount,
      currencyCode: form.currencyCode,
      targetDate: form.targetDate
    };

    if (editing) {
      await apiRequest(
        `/savings-goals/${editing.id}`,
        {
          method: "PATCH",
          body: JSON.stringify(body)
        }
      );
    } else {
      await apiRequest("/savings-goals", {
        method: "POST",
        body: JSON.stringify(body)
      });
    }

    setModalOpen(false);
    await loadGoals();
  }

  async function addContribution(form) {
    await apiRequest(
      `/savings-goals/${contributionGoal.id}/contributions`,
      {
        method: "POST",
        body: JSON.stringify({
          transactionId: form.transactionId,
          amount: form.amount
        })
      }
    );

    setContributionGoal(null);

    await Promise.all([
      loadGoals(),
      loadTransactions()
    ]);
  }

  return (
    <div>
      <PageHeader
        title="Savings Goals"
        description="Track progress toward your financial goals."
        action={
          <Button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
            className="gap-2"
          >
            <Plus className="h-5 w-5" />
            Add Goal
          </Button>
        }
      />

      <ErrorMessage message={error} />

      {loading ? (
        <Loading />
      ) : goals.length === 0 ? (
        <EmptyState
          message="No savings goals yet."
          action={
            <Button
              onClick={() => {
                setEditing(null);
                setModalOpen(true);
              }}
            >
              Create Goal
            </Button>
          }
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {goals.map((goal) => {
            const saved =
              goal.totalSaved ??
              goal.currentAmount ??
              goal.savedAmount ??
              0;

            const percentage =
              goal.percentage ??
              (Number(goal.targetAmount)
                ? (Number(saved) /
                    Number(goal.targetAmount)) *
                  100
                : 0);

            const achieved =
              goal.achieved ??
              Number(saved) >=
                Number(goal.targetAmount);

            return (
              <div
                key={goal.id}
                className="min-w-0 rounded-xl border bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="break-words font-semibold">
                      {goal.name}
                    </h3>

                    <p className="mt-1 text-sm text-gray-500">
                      Target:{" "}
                      {formatMoney(
                        goal.targetAmount,
                        goal.currencyCode
                      )}
                    </p>

                    {achieved && (
                      <div className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-green-700">
                        <CheckCircle2 className="h-4 w-4" />
                        Achieved
                      </div>
                    )}
                  </div>

                  <div className="flex shrink-0 gap-1 self-end sm:self-auto">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setEditing(goal);
                        setModalOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="danger"
                      onClick={() =>
                        setDeleting(goal)
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="flex flex-wrap justify-between gap-2 text-sm">
                    <span>
                      Saved:{" "}
                      {formatMoney(
                        saved,
                        goal.currencyCode
                      )}
                    </span>

                    <span>
                      {formatPercentage(
                        Math.min(
                          Number(percentage),
                          100
                        )
                      )}
                    </span>
                  </div>

                  <div className="mt-2 h-3 overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full rounded-full bg-green-600"
                      style={{
                        width: `${Math.min(
                          Number(percentage),
                          100
                        )}%`
                      }}
                    />
                  </div>

                  {!achieved && (
                    <Button
                      onClick={() =>
                        setContributionGoal(goal)
                      }
                      className="mt-4 w-full"
                    >
                      Add Contribution
                    </Button>
                  )}

                  {achieved && (
                    <div className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-center text-sm font-medium text-green-700">
                      Savings goal achieved
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <GoalModal
          goal={editing}
          onClose={() => setModalOpen(false)}
          onSave={saveGoal}
        />
      )}

      {contributionGoal && (
        <ContributionModal
          goal={contributionGoal}
          transactions={transactions}
          goals={goals}
          onClose={() =>
            setContributionGoal(null)
          }
          onSave={addContribution}
        />
      )}

      {deleting && (
        <Modal
          title="Delete Savings Goal"
          onClose={() => {
            if (!deleteLoading) {
              setDeleting(null);
            }
          }}
        >
          <p className="text-sm text-gray-600">
            Are you sure you want to delete the savings goal
            "{deleting.name}"? This action cannot be undone.
          </p>

          <div className="mt-6 flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDeleting(null)}
              disabled={deleteLoading}
            >
              Cancel
            </Button>

            <Button
              type="button"
              variant="danger"
              onClick={deleteGoal}
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

function GoalModal({
  goal,
  onClose,
  onSave
}) {
  const [form, setForm] = useState({
    name: goal?.name ?? "",
    targetAmount:
      goal?.targetAmount ?? "",
    currencyCode:
      goal?.currencyCode ?? "INR",
    targetDate:
      goal?.targetDate
        ? goal.targetDate.slice(0, 10)
        : new Date().toISOString().slice(0, 10)
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

    setSaving(true);
    setModalError("");

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
      title={
        goal
          ? "Edit Savings Goal"
          : "Add Savings Goal"
      }
      onClose={onClose}
    >
      <form
        onSubmit={submit}
        className="space-y-4"
      >
        <ErrorMessage message={modalError} />

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Name
          </label>

          <input
            value={form.name}
            onChange={(e) =>
              update("name", e.target.value)
            }
            required
            placeholder="Emergency Fund"
            className="w-full rounded-lg border px-3 py-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Target Amount
          </label>

          <input
            type="number"
            min="0.0001"
            step="0.0001"
            value={form.targetAmount}
            onChange={(e) =>
              update(
                "targetAmount",
                e.target.value
              )
            }
            required
            placeholder="Target amount"
            className="w-full rounded-lg border px-3 py-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Currency
          </label>

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
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Target Date
          </label>

          <input
            type="date"
            value={form.targetDate}
            onChange={(e) =>
              update(
                "targetDate",
                e.target.value
              )
            }
            required
            className="w-full rounded-lg border px-3 py-2"
          />
        </div>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={saving}
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

function ContributionModal({
  goal,
  transactions,
  goals,
  onClose,
  onSave
}) {
  const incomeTransactions =
    transactions.filter(
      (transaction) =>
        transaction.type === "INCOME" &&
        transaction.currencyCode ===
          goal.currencyCode
    );

  function getAllocatedAmount(transactionId) {
    return goals.reduce((goalTotal, currentGoal) => {
      const contributions =
        currentGoal.contributions ?? [];

      const transactionTotal =
        contributions.reduce(
          (total, contribution) => {
            if (
              contribution.transactionId ===
              transactionId
            ) {
              return (
                total +
                Number(contribution.amount)
              );
            }

            return total;
          },
          0
        );

      return goalTotal + transactionTotal;
    }, 0);
  }

  const availableTransactions =
    incomeTransactions
      .map((transaction) => {
        const allocated =
          getAllocatedAmount(transaction.id);

        const available = Math.max(
          Number(transaction.amount) - allocated,
          0
        );

        return {
          ...transaction,
          availableAmount: available
        };
      })
      .filter(
        (transaction) =>
          transaction.availableAmount > 0
      );

  const [form, setForm] = useState({
    transactionId: "",
    amount: ""
  });

  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  const selectedTransaction =
    availableTransactions.find(
      (transaction) =>
        transaction.id === form.transactionId
    );

  const saved = Number(
    goal.totalSaved ??
      goal.currentAmount ??
      goal.savedAmount ??
      0
  );

  const goalRemaining = Math.max(
    Number(goal.targetAmount) - saved,
    0
  );

  const maximumContribution =
    selectedTransaction
      ? Math.min(
          selectedTransaction.availableAmount,
          goalRemaining
        )
      : 0;

  function selectTransaction(transactionId) {
    setForm({
      transactionId,
      amount: ""
    });

    setModalError("");
  }

  function updateAmount(value) {
    setForm((current) => ({
      ...current,
      amount: value
    }));

    setModalError("");
  }

  async function submit(event) {
    event.preventDefault();

    setModalError("");

    if (!selectedTransaction) {
      setModalError(
        "Please select an income transaction."
      );
      return;
    }

    const contributionAmount =
      Number(form.amount);

    if (
      !Number.isFinite(contributionAmount) ||
      contributionAmount <= 0
    ) {
      setModalError(
        "Contribution amount must be greater than zero."
      );
      return;
    }

    if (
      contributionAmount >
      selectedTransaction.availableAmount
    ) {
      setModalError(
        "Contribution amount cannot exceed the available amount from this income transaction."
      );
      return;
    }

    if (
      contributionAmount >
      goalRemaining
    ) {
      setModalError(
        "Contribution amount cannot exceed the remaining amount for this savings goal."
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
      title={`Add Contribution — ${goal.name}`}
      onClose={onClose}
    >
      <form
        onSubmit={submit}
        className="space-y-4"
      >
        <ErrorMessage message={modalError} />

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Income Transaction
          </label>

          <select
            value={form.transactionId}
            onChange={(e) =>
              selectTransaction(e.target.value)
            }
            required
            className="w-full rounded-lg border px-3 py-2"
          >
            <option value="">
              Select an income transaction
            </option>

            {availableTransactions.map(
              (transaction) => (
                <option
                  key={transaction.id}
                  value={transaction.id}
                >
                  {transaction.description ||
                    "Income"}{" "}
                  — Available:{" "}
                  {formatMoney(
                    transaction.availableAmount,
                    transaction.currencyCode
                  )}
                  {transaction.account?.name
                    ? ` — ${transaction.account.name}`
                    : ""}
                </option>
              )
            )}
          </select>

          {availableTransactions.length === 0 && (
            <p className="mt-1 text-sm text-gray-500">
              No available income transactions in{" "}
              {goal.currencyCode}.
            </p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Contribution Amount
          </label>

          <input
            type="number"
            min="0.0001"
            step="0.0001"
            max={
              selectedTransaction
                ? maximumContribution
                : undefined
            }
            value={form.amount}
            onChange={(e) =>
              updateAmount(e.target.value)
            }
            required
            disabled={!selectedTransaction}
            placeholder={
              selectedTransaction
                ? "Enter contribution amount"
                : "Select an income transaction first"
            }
            className="w-full rounded-lg border px-3 py-2 disabled:cursor-not-allowed disabled:bg-gray-100"
          />

          {selectedTransaction && (
            <>
              <p className="mt-1 text-sm text-gray-500">
                Available from this income:{" "}
                {formatMoney(
                  selectedTransaction.availableAmount,
                  selectedTransaction.currencyCode
                )}
              </p>

              <p className="mt-1 text-sm text-gray-500">
                Maximum contribution:{" "}
                {formatMoney(
                  maximumContribution,
                  goal.currencyCode
                )}
              </p>
            </>
          )}

          <p className="mt-1 text-sm text-gray-500">
            Remaining for this goal:{" "}
            {formatMoney(
              goalRemaining,
              goal.currencyCode
            )}
          </p>
        </div>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            disabled={
              saving ||
              availableTransactions.length === 0 ||
              !selectedTransaction
            }
          >
            {saving
              ? "Adding..."
              : "Add Contribution"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default SavingsGoals;