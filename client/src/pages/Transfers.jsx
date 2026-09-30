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

function Transfers() {
  const [transfers, setTransfers] = useState([]);
  const [accounts, setAccounts] = useState([]);

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

      const [transferData, accountData] =
        await Promise.all([
          apiRequest("/transfers"),
          apiRequest("/accounts")
        ]);

      setTransfers(
        Array.isArray(transferData)
          ? transferData
          : transferData.transfers ?? []
      );

      setAccounts(
        Array.isArray(accountData)
          ? accountData
          : accountData.accounts ?? []
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

  async function deleteTransfer() {
    if (!deleting) return;

    try {
      setDeleteLoading(true);

      await apiRequest(`/transfers/${deleting.id}`, {
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

  async function saveTransfer(form) {
    try {
      setError("");

      const body = {
        fromAccountId: form.fromAccountId,
        toAccountId: form.toAccountId,
        amount: form.amount,
        description: form.description,
        transferDate: form.transferDate
      };

      if (editing) {
        await apiRequest(
          `/transfers/${editing.id}`,
          {
            method: "PATCH",
            body: JSON.stringify(body)
          }
        );
      } else {
        await apiRequest("/transfers", {
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
        title="Transfers"
        description="Move money between your accounts."
        action={
          <Button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
            className="gap-2"
          >
            <Plus className="h-5 w-5" />
            Add Transfer
          </Button>
        }
      />

      <ErrorMessage message={error} />

      {loading ? (
        <Loading />
      ) : transfers.length === 0 ? (
        <EmptyState
          message="No transfers yet."
          action={
            <Button
              onClick={() => {
                setEditing(null);
                setModalOpen(true);
              }}
            >
              Add Transfer
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <div className="w-full overflow-x-auto">
            <table className="min-w-[950px] w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="whitespace-nowrap px-5 py-4 text-left">
                    Date
                  </th>

                  <th className="whitespace-nowrap px-5 py-4 text-left">
                    From
                  </th>

                  <th className="whitespace-nowrap px-5 py-4 text-left">
                    To
                  </th>

                  <th className="px-5 py-4 text-left">
                    Description
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
                {transfers.map((transfer) => (
                  <tr key={transfer.id}>
                    <td className="whitespace-nowrap px-5 py-4">
                      {formatDate(
                        transfer.transferDate
                      )}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4">
                      {transfer.fromAccount?.name ||
                        "—"}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4">
                      {transfer.toAccount?.name ||
                        "—"}
                    </td>

                    <td className="max-w-[260px] px-5 py-4">
                      {transfer.description ? (
                        <div className="flex items-center gap-2">
                          <span className="block truncate">
                            {transfer.description}
                          </span>

                          {transfer.description.length >
                            40 && (
                            <button
                              type="button"
                              onClick={() =>
                                setDescriptionModal(
                                  transfer.description
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

                    <td className="whitespace-nowrap px-5 py-4 text-right">
                      {formatMoney(
                        transfer.amount,
                        transfer.fromAccount
                          ?.currencyCode || "INR"
                      )}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4">
                      <div className="flex min-w-max justify-end gap-2">
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setEditing(transfer);
                            setModalOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="danger"
                          onClick={() =>
                            setDeleting(transfer)
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
        <TransferModal
          transfer={editing}
          accounts={accounts}
          onClose={() => setModalOpen(false)}
          onSave={saveTransfer}
        />
      )}

      {deleting && (
        <Modal
          title="Delete Transfer"
          onClose={() => {
            if (!deleteLoading) {
              setDeleting(null);
            }
          }}
        >
          <p className="text-sm text-gray-600">
            Are you sure you want to delete this transfer?
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
              onClick={deleteTransfer}
              disabled={deleteLoading}
            >
              {deleteLoading ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </Modal>
      )}

      {descriptionModal && (
        <Modal
          title="Transfer Description"
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

function TransferModal({
  transfer,
  accounts,
  onClose,
  onSave
}) {
  const [form, setForm] = useState({
    fromAccountId:
      transfer?.fromAccountId ?? "",
    toAccountId:
      transfer?.toAccountId ?? "",
    amount: transfer?.amount ?? "",
    description:
      transfer?.description ?? "",
    transferDate: transfer?.transferDate
      ? new Date(transfer.transferDate)
          .toISOString()
          .slice(0, 10)
      : new Date().toISOString().slice(0, 10)
  });

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  function update(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value
    }));

    setFormError("");
  }

  async function submit(event) {
    event.preventDefault();

    if (
      form.fromAccountId ===
      form.toAccountId
    ) {
      setFormError(
        "From Account and To Account must be different."
      );

      return;
    }

    setFormError("");
    setSaving(true);

    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  }

  const sameAccount =
    form.fromAccountId &&
    form.toAccountId &&
    form.fromAccountId ===
      form.toAccountId;

  return (
    <Modal
      title={
        transfer
          ? "Edit Transfer"
          : "Add Transfer"
      }
      onClose={onClose}
    >
      <form
        onSubmit={submit}
        className="space-y-4"
      >
        <div>
          <label className="mb-1 block text-sm font-medium">
            From Account
          </label>

          <select
            value={form.fromAccountId}
            onChange={(e) =>
              update(
                "fromAccountId",
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
            To Account
          </label>

          <select
            value={form.toAccountId}
            onChange={(e) =>
              update(
                "toAccountId",
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

        {sameAccount && (
          <p className="text-sm text-red-600">
            From Account and To Account must be different.
          </p>
        )}

        {formError && !sameAccount && (
          <p className="text-sm text-red-600">
            {formError}
          </p>
        )}

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
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            Date
          </label>

          <input
            type="date"
            value={form.transferDate}
            onChange={(e) =>
              update(
                "transferDate",
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
            disabled={
              saving ||
              Boolean(sameAccount)
            }
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default Transfers;