import {
  Navigate,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { createDuplicateDraft } from "./duplication";
import { TransactionForm } from "./TransactionForm";
import { useTransactions } from "./TransactionProvider";

export function TransactionFormPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { transactions, createTransaction, updateTransaction } =
    useTransactions();
  const transaction = id
    ? transactions.find((candidate) => candidate.id === id)
    : undefined;
  const duplicateId = id ? null : searchParams.get("duplicate");
  const duplicateSource = duplicateId
    ? transactions.find((candidate) => candidate.id === duplicateId)
    : undefined;

  if ((id && !transaction) || (duplicateId && !duplicateSource)) {
    return <Navigate to="/app/transactions" replace />;
  }

  return (
    <div className="drawer-page">
      <TransactionForm
        transaction={transaction}
        initialDraft={
          duplicateSource
            ? createDuplicateDraft(duplicateSource, new Date())
            : undefined
        }
        onCancel={() => navigate(-1)}
        onSubmit={async (draft) => {
          if (transaction) {
            await updateTransaction(transaction.id, draft);
          } else {
            await createTransaction(draft);
          }
          navigate("/app/transactions");
        }}
      />
    </div>
  );
}
