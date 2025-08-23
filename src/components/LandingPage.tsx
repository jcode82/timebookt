// import Header from "@/components/Header";
// import Footer from "@/components/Footer";
// import WaitlistForm from "@/components/WaitlistForm";

// export default function LandingPage() {
//   return (
//     <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6">
//       {/* Header */}
//       <Header />

//       {/* Hero Section */}
//       <main className="flex flex-col items-center text-center mt-12 flex-1">
//         <h2 className="text-4xl md:text-5xl font-extrabold text-[#1E2A38] mb-4">
//           Your time, well <span className="text-[#3DDC97]">bookt</span>.
//         </h2>
//         <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl">
//           Smarter scheduling, fewer no-shows, and more time back in your day.
//         </p>

//         {/* CTA: Waitlist Form */}
//         <WaitlistForm />
//       </main>

//       {/* Footer */}
//       <Footer />
//     </div>
//   );
// }
//&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&
//first iteration above
//&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&


// import Header from "./Header";
// import Footer from "./Footer";

// export default function LandingPage() {
//   return (
//     <div className="min-h-screen bg-gray-50 flex flex-col">
//       {/* Header stays at the top */}
//       <Header />

//       {/* Hero Section */}
//       <main className="flex flex-col flex-1 items-center justify-center text-center px-6 mt-12">
//         <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-gray-900">
//           Smarter Scheduling Starts Here
//         </h1>
//         <p className="mt-6 text-lg leading-8 text-gray-600 max-w-2xl">
//           Join TimeBookt and take control of your scheduling with ease and speed.
//         </p>
//         <div className="mt-10">
//           <form className="flex flex-col sm:flex-row gap-4 justify-center">
//             <input
//               type="email"
//               required
//               placeholder="Enter your email"
//               className="px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#3ddc97]"
//             />
//             <button
//               type="submit"
//               className="px-6 py-2 rounded-md bg-[#3ddc97] text-white font-medium hover:bg-[#33c487]"
//             >
//               Join the Beta
//             </button>
//           </form>
//         </div>
//       </main>

//       {/* Footer stays centered at bottom */}
//       <div className="mt-auto">
//         <Footer />
//       </div>
//     </div>
//   );
// }

//%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
//second iteration above still not working
//%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WaitlistForm from "@/components/WaitlistForm";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6">
      {/* Header */}
      <Header />

      {/* Hero Section */}
      <main className="flex flex-col items-center text-center mt-12 flex-direction: column">
        <h2 className="text-4xl md:text-5xl font-extrabold text-[#1E2A38] mb-4">
          Your time, well <span className="text-[#3DDC97]">bookt</span>.
        </h2>
        <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl">
          Smarter scheduling, fewer no-shows, and more time back in your day.
        </p>

        {/* CTA: Waitlist Form */}
        <WaitlistForm />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}