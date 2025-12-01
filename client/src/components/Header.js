import StatusBadge from './StatusBadge';

export default function Header({ status }) {
  return (
    <header className="bg-white border-b border-gray-200 p-4 flex justify-between items-center">
      <h1 className="text-xl font-semibold text-gray-800">Dashboard</h1>
      <StatusBadge status={status} />
    </header>
  );
}