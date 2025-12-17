import avatar from "../../assets/images/avatar.svg";
import avatarBottom from "../../assets/images/avatar-bottom.svg";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function VisitorPage() {
  return (
    <div className="flex items-center justify-center px-4 pt-20 pb-10 min-h-screen">
      <div className="container min-h-full grid grid-cols-1 md:grid-cols-2">
        <div className="flex flex-col items-start justify-center p-6 gap-4">
          {/* Left section content */}
          <h1 className="font-[var(--font-inter)] font-extrabold text-[3.34rem] leading-[100%] tracking-[-0.02em] align-middle">
            Welcome to FLOOKA!
          </h1>
          <p className="font-[var(--font-inter)] font-semibold text-[1.5rem] text-muted leading-[100%] tracking-[0] md:w-[80%]">
            Post, share, and connect on social media that respects your voyage.
          </p>
          <Button className="mt-6" variant="default" size="lg" borderRadius="full">
            <Link to="/sign-up">Get Started</Link>
          </Button>
        </div>
        <div className="flex relative items-center justify-center p-6">
          {/* Right section content */}
          <img src={avatar} alt="Visitor Avatar" className="max-w-full h-auto" />
          <div className="absolute bottom-0 right-0 translate-x-[-25%]">
            <img width={240} src={avatarBottom} alt="Avatar Bottom Decoration" className="max-w-full h-auto" />
          </div>
        </div>
      </div>
    </div>
  );
}
