import { BookingInquiryClient } from "@/components/BookingInquiryClient";
import { MarketingHeader } from "@/components/MarketingHeader";

export default function BookingInquiryPage() {
  return (
    <>
      <MarketingHeader showAnnouncement={false} />
      <main className="mx-auto grid min-h-[calc(100vh-73px)] max-w-[980px] place-items-center px-5 py-12 md:px-7">
        <BookingInquiryClient />
      </main>
    </>
  );
}
