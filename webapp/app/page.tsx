import Link from "next/link";

export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <div className="flex flex-col items-center gap-4 text-center w-full">
          <h1 className="text-4xl font-medium">On the Way</h1>
          <p className="text-xl">Peer-to-peer delivery platform</p>
        </div>

        <div className="flex flex-col gap-6 items-center">
          <p className="text-center max-w-md">
            Connect buyers with travelers to get items delivered from places
            they can&apos;t visit.
          </p>

          <div className="flex gap-4 items-center flex-col sm:flex-row">
            <Link
              className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto"
              href="/login"
            >
              Get Started
            </Link>
          </div>
        </div>
      </main>
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
        <p className="text-sm text-muted-foreground">
          © On the Way 2025. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
