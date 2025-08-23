// export default function LandingPage() {
//   return (
//     <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6">
//       {/* Header */}
//       <header className="w-full max-w-5xl flex items-center justify-between py-6">
//         <h1 className="text-2xl font-bold text-[#1E2A38] flex items-center">
//           <span className="text-[#3DDC97]">Time</span>bookt
//         </h1>
//         <nav>
//           <button className="text-sm font-medium text-[#1E2A38] hover:text-[#3BAFDA]">
//             Login
//           </button>
//         </nav>
//       </header>

//       {/* Hero Section */}
//       <main className="flex flex-col items-center text-center mt-12">
//         <h2 className="text-4xl md:text-5xl font-extrabold text-[#1E2A38] mb-4">
//           Your time, well <span className="text-[#3DDC97]">bookt</span>.
//         </h2>
//         <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl">
//           Smarter scheduling, fewer no-shows, and more time back in your day.
//         </p>

//         {/* CTA */}
//         <form className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
//           <input
//             type="email"
//             placeholder="Enter your email"
//             className="flex-1 rounded-xl px-4 py-3 border border-gray-300 focus:ring-2 focus:ring-[#3BAFDA] focus:outline-none"
//           />
//           <button
//             type="submit"
//             className="bg-[#3DDC97] hover:bg-[#3BAFDA] text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-md"
//           >
//             Join the Beta
//           </button>
//         </form>
//       </main>

//       {/* Footer */}
//       <footer className="mt-16 text-gray-500 text-sm">
//         © {new Date().getFullYear()} Timebookt. All rights reserved.
//       </footer>
//     </div>
//   );
// }
// ------------------------------------------------------------------------------

import LandingPage from "@/components/LandingPage";

export default function HomePage() {
  return <LandingPage />;
}
