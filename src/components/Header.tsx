export default function Header() {
  return (
    <header className="w-full max-w-5xl flex items-center justify-between py-6">
      <h1 className="text-2xl font-bold text-[#1E2A38] flex items-center">
        <span className="text-[#3DDC97]">Time</span>bookt
      </h1>
      <nav>
        <button className="text-sm font-medium text-[#1E2A38] hover:text-[#3BAFDA]">
          Login
        </button>
      </nav>
    </header>
  );
}
