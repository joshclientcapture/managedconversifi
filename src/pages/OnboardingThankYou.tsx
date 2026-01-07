import { useEffect } from "react";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle2, Calendar } from "lucide-react";

const OnboardingThankYou = () => {
  useEffect(() => {
    // Load Calendly widget script
    const script = document.createElement("script");
    script.src = "https://assets.calendly.com/assets/external/widget.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      // Cleanup script on unmount
      const existingScript = document.querySelector(
        'script[src="https://assets.calendly.com/assets/external/widget.js"]'
      );
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header hideLogout />
      <main className="flex-1 py-8 px-4 sm:py-12 sm:px-6 lg:py-16">
        <div className="container max-w-4xl mx-auto">
          {/* Success Message */}
          <div className="text-center mb-8 sm:mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-6">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-semibold text-foreground mb-3">
              Thank You!
            </h1>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Your onboarding form has been submitted successfully. We're excited to work with you!
            </p>
          </div>

          {/* Calendar Section */}
          <Card className="border-border/50 shadow-lg backdrop-blur-sm bg-card/80">
            <CardHeader className="text-center pb-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4 mx-auto">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-xl sm:text-2xl">Schedule Your Onboarding Call</CardTitle>
              <CardDescription className="text-base">
                Please find a time on the calendar below that works best for you
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className="calendly-inline-widget"
                data-url="https://calendly.com/jamal-conversifi/conversifi-io-onboarding-call?hide_gdpr_banner=1"
                style={{ minWidth: "320px", height: "700px" }}
              />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default OnboardingThankYou;
