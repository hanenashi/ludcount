import { Navigate, useNavigate, useParams } from "react-router-dom";
import { TransactionForm } from "./TransactionForm";
import { useTransactions } from "./TransactionProvider";

export function TransactionFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { transactions, createTransaction, updateTransaction } =
    useTransactions();
  const transaction = id
    ? transactions.find((candidate) => candidate.id === id)
    : undefined;

  if (id && !transaction) {
    return <Navigate to="/app/transactions" replace />;
  }

  return (
    <div className="drawer-page">
      <TransactionForm
        transaction={transaction}
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
