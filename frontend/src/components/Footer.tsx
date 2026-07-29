import Link from "next/link";

export function Footer() {
  return (
    <footer className="w-full py-[64px] bg-surface-container-low dark:bg-surface-container-lowest border-t border-outline-variant mt-auto relative z-50">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-[40px] px-[20px] md:px-[48px] max-w-[1440px] mx-auto">
        <div>
          <div className="font-headline-md text-[24px] text-primary mb-[16px]">ForkFlow</div>
          <p className="font-label-sm text-[12px] text-on-surface-variant">© 2024 ForkFlow Inc. Premium Delivery Services.</p>
        </div>
        <div className="flex flex-col gap-[16px]">
          <Link href="/dashboard/restaurant" className="font-label-sm text-[12px] text-on-surface-variant hover:text-primary hover:underline transition-all opacity-80 hover:opacity-100">Become a Partner</Link>
          <Link href="/dashboard/delivery" className="font-label-sm text-[12px] text-on-surface-variant hover:text-primary hover:underline transition-all opacity-80 hover:opacity-100">Drive with us</Link>
        </div>
        <div className="flex flex-col gap-[16px]">
          <Link href="#" className="font-label-sm text-[12px] text-on-surface-variant hover:text-primary hover:underline transition-all opacity-80 hover:opacity-100">Terms of Service</Link>
          <Link href="#" className="font-label-sm text-[12px] text-on-surface-variant hover:text-primary hover:underline transition-all opacity-80 hover:opacity-100">Privacy Policy</Link>
        </div>
        <div className="flex flex-col gap-[16px]">
          <Link href="#" className="font-label-sm text-[12px] text-on-surface-variant hover:text-primary hover:underline transition-all opacity-80 hover:opacity-100">Contact Support</Link>
        </div>
      </div>
    </footer>
  );
}
