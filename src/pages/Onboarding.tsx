import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Upload, User, Target, Briefcase, FileText, Send } from "lucide-react";

const INDUSTRIES = [
  "Technology & SaaS",
  "Marketing & Advertising",
  "Financial Services",
  "Healthcare",
  "Real Estate",
  "E-commerce",
  "Consulting",
  "Legal Services",
  "Manufacturing",
  "Education",
  "Other",
];

const COMPANY_HEADCOUNTS = [
  { label: "Self-employed", count: "14K+" },
  { label: "1-10", count: "21K+" },
  { label: "11-50", count: "14K+" },
  { label: "51-200", count: "10K+" },
  { label: "201-500", count: "6K+" },
  { label: "501-1000", count: "4K+" },
  { label: "1001-5000", count: "9K+" },
  { label: "5001-10,000", count: "3.5K+" },
  { label: "10,000+", count: "10K+" },
];

const DEAL_SIZES = [
  "Under $1k",
  "$1k-5k",
  "$5k-15k",
  "$15k-50k",
  "$50k-100k",
  "$100k+",
];

const Onboarding = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    companyName: "",
    email: "",
    phone: "",
    linkedinUrl: "",
    websiteUrl: "",
    industry: "",
    hasCalendly: "",
    country: "",
    streetAddress: "",
    cityState: "",
    idealClient: "",
    companyHeadcounts: [] as string[],
    geography: "",
    industries: "",
    jobTitles: "",
    problemSolved: "",
    successStories: "",
    dealSize: "",
    salesPerson: "",
    blacklistUrls: "",
  });
  const [files, setFiles] = useState<File[]>([]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCheckboxChange = (headcount: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      companyHeadcounts: checked
        ? [...prev.companyHeadcounts, headcount]
        : prev.companyHeadcounts.filter((h) => h !== headcount),
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Basic validation
    const requiredFields = [
      "firstName", "lastName", "companyName", "email", "phone",
      "linkedinUrl", "websiteUrl", "industry", "hasCalendly",
      "country", "streetAddress", "cityState"
    ];

    const missingFields = requiredFields.filter(
      (field) => !formData[field as keyof typeof formData]
    );

    if (missingFields.length > 0) {
      toast.error("Please fill in all required fields");
      setIsSubmitting(false);
      return;
    }

    try {
      const formDataToSend = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (key === "companyHeadcounts") {
          formDataToSend.append(key, JSON.stringify(value));
        } else {
          formDataToSend.append(key, value as string);
        }
      });

      files.forEach((file, index) => {
        formDataToSend.append(`file_${index}`, file);
      });

      const { data, error } = await supabase.functions.invoke("submit-onboarding", {
        body: formDataToSend,
      });

      if (error) throw error;

      toast.success("Onboarding form submitted successfully! We'll be in touch soon.");
      setFormData({
        firstName: "", lastName: "", companyName: "", email: "", phone: "",
        linkedinUrl: "", websiteUrl: "", industry: "", hasCalendly: "",
        country: "", streetAddress: "", cityState: "", idealClient: "",
        companyHeadcounts: [], geography: "", industries: "", jobTitles: "",
        problemSolved: "", successStories: "", dealSize: "", salesPerson: "", blacklistUrls: "",
      });
      setFiles([]);
    } catch (error) {
      console.error("Submission error:", error);
      toast.error("Failed to submit form. Please try again.");
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header hideLogout />
      <main className="flex-1 py-8 px-4 sm:py-12 sm:px-6 lg:py-16">
        <div className="container max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8 sm:mb-12">
            <h1 className="text-3xl sm:text-4xl font-semibold text-foreground mb-3">
              Client Onboarding
            </h1>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Tell us about your business so we can tailor our services to your needs
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Information */}
            <Card className="glass-panel border-0">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Basic Information</CardTitle>
                    <CardDescription>Your contact and company details</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange("firstName", e.target.value)}
                      placeholder="John"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange("lastName", e.target.value)}
                      placeholder="Doe"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name *</Label>
                  <Input
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) => handleInputChange("companyName", e.target.value)}
                    placeholder="Acme Inc."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      placeholder="john@acme.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="linkedinUrl">LinkedIn URL *</Label>
                  <Input
                    id="linkedinUrl"
                    value={formData.linkedinUrl}
                    onChange={(e) => handleInputChange("linkedinUrl", e.target.value)}
                    placeholder="https://linkedin.com/in/johndoe"
                  />
                  <p className="text-xs text-muted-foreground">Please provide your complete LinkedIn profile URL</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="websiteUrl">Website URL *</Label>
                  <Input
                    id="websiteUrl"
                    value={formData.websiteUrl}
                    onChange={(e) => handleInputChange("websiteUrl", e.target.value)}
                    placeholder="https://acme.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="industry">Industry/Service *</Label>
                  <Select
                    value={formData.industry}
                    onValueChange={(value) => handleInputChange("industry", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDUSTRIES.map((industry) => (
                        <SelectItem key={industry} value={industry}>
                          {industry}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label>Calendly Account *</Label>
                  <RadioGroup
                    value={formData.hasCalendly}
                    onValueChange={(value) => handleInputChange("hasCalendly", value)}
                    className="space-y-3"
                  >
                    <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:border-primary/30 transition-colors">
                      <RadioGroupItem value="yes" id="calendly-yes" className="mt-1" />
                      <Label htmlFor="calendly-yes" className="font-normal cursor-pointer">
                        Yes, I have a Calendly account and I have the 'Standard' plan.
                      </Label>
                    </div>
                    <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:border-primary/30 transition-colors">
                      <RadioGroupItem value="no" id="calendly-no" className="mt-1" />
                      <Label htmlFor="calendly-no" className="font-normal cursor-pointer">
                        No, but I will create a Calendly account and subscribe to the 'Standard' plan before the onboarding call.
                      </Label>
                    </div>
                  </RadioGroup>
                  <p className="text-xs text-muted-foreground">
                    We strongly recommend using Calendly as it integrates with all of our internal systems and allows us to track bookings, send reminders and aligns with our tech stack.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Country of Operation *</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => handleInputChange("country", e.target.value)}
                    placeholder="United States"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="streetAddress">Street Address *</Label>
                  <Input
                    id="streetAddress"
                    value={formData.streetAddress}
                    onChange={(e) => handleInputChange("streetAddress", e.target.value)}
                    placeholder="123 Main Street"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cityState">City, State/Province *</Label>
                  <Input
                    id="cityState"
                    value={formData.cityState}
                    onChange={(e) => handleInputChange("cityState", e.target.value)}
                    placeholder="San Francisco, CA"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Ideal Client */}
            <Card className="glass-panel border-0">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Target className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Ideal Client Profile</CardTitle>
                    <CardDescription>Help us understand who you want to reach</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="idealClient">Describe your ideal client</Label>
                  <Textarea
                    id="idealClient"
                    value={formData.idealClient}
                    onChange={(e) => handleInputChange("idealClient", e.target.value)}
                    placeholder="Add things like their role, industry, company size, where they're based, and their main pain points..."
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    Describe your ideal client in as much detail as you can.
                  </p>
                </div>

                <div className="space-y-3">
                  <Label>Company Headcount</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Help us refine the targeting for your ideal clients by selecting the most relevant options
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {COMPANY_HEADCOUNTS.map((headcount) => (
                      <div
                        key={headcount.label}
                        className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:border-primary/30 transition-colors"
                      >
                        <Checkbox
                          id={`headcount-${headcount.label}`}
                          checked={formData.companyHeadcounts.includes(headcount.label)}
                          onCheckedChange={(checked) =>
                            handleCheckboxChange(headcount.label, checked as boolean)
                          }
                        />
                        <Label
                          htmlFor={`headcount-${headcount.label}`}
                          className="font-normal cursor-pointer text-sm"
                        >
                          {headcount.label}{" "}
                          <span className="text-muted-foreground">{headcount.count}</span>
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="geography">Geography/Location(s)</Label>
                  <Input
                    id="geography"
                    value={formData.geography}
                    onChange={(e) => handleInputChange("geography", e.target.value)}
                    placeholder="e.g., United States, Canada, UK"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="industries">Industry(ies)</Label>
                  <Input
                    id="industries"
                    value={formData.industries}
                    onChange={(e) => handleInputChange("industries", e.target.value)}
                    placeholder="e.g., SaaS, Healthcare, Finance"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="jobTitles">Job Title(s)</Label>
                  <Input
                    id="jobTitles"
                    value={formData.jobTitles}
                    onChange={(e) => handleInputChange("jobTitles", e.target.value)}
                    placeholder="e.g., CEO, VP of Sales, Marketing Director"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Business Details */}
            <Card className="glass-panel border-0">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Briefcase className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Business Details</CardTitle>
                    <CardDescription>Tell us about your services and results</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="problemSolved">What problem do you solve?</Label>
                  <Textarea
                    id="problemSolved"
                    value={formData.problemSolved}
                    onChange={(e) => handleInputChange("problemSolved", e.target.value)}
                    placeholder="Describe the main problem you solve and the result your clients get..."
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    Be specific. Include what you help them achieve, how you help them save time or money, and why your solution is better. More detail helps Conversifi talk like you.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="successStories">Best client results and success stories</Label>
                  <Textarea
                    id="successStories"
                    value={formData.successStories}
                    onChange={(e) => handleInputChange("successStories", e.target.value)}
                    placeholder="Include specific metrics (e.g., 30% more leads, $50k revenue growth) and real examples..."
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    Mention the client type, result, and timeframe if possible. The more specific, the better Conversifi can write credible, result-driven messages.
                  </p>
                </div>

                <div className="space-y-3">
                  <Label>Average client value or deal size</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Choose the price range that best represents what a new client is worth to your business.
                  </p>
                  <RadioGroup
                    value={formData.dealSize}
                    onValueChange={(value) => handleInputChange("dealSize", value)}
                    className="grid grid-cols-2 sm:grid-cols-3 gap-3"
                  >
                    {DEAL_SIZES.map((size) => (
                      <div
                        key={size}
                        className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:border-primary/30 transition-colors"
                      >
                        <RadioGroupItem value={size} id={`deal-${size}`} />
                        <Label htmlFor={`deal-${size}`} className="font-normal cursor-pointer text-sm">
                          {size}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="salesPerson">Who takes the sales calls?</Label>
                  <Input
                    id="salesPerson"
                    value={formData.salesPerson}
                    onChange={(e) => handleInputChange("salesPerson", e.target.value)}
                    placeholder="Full name of the person taking calls"
                  />
                  <p className="text-xs text-muted-foreground">
                    This name is used whenever a prospect asks who the call will be with, or when someone other than the LinkedIn account owner is taking the call.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="blacklistUrls">LinkedIn Profile Blacklist</Label>
                  <Textarea
                    id="blacklistUrls"
                    value={formData.blacklistUrls}
                    onChange={(e) => handleInputChange("blacklistUrls", e.target.value)}
                    placeholder="List any LinkedIn Profile URLs that you do NOT want to contact (one per line)"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Extra Information */}
            <Card className="glass-panel border-0">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Extra Information & Documentation</CardTitle>
                    <CardDescription>Upload any additional files or documents</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/30 transition-colors">
                  <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                  <Label
                    htmlFor="file-upload"
                    className="cursor-pointer text-primary hover:text-primary/80 font-medium"
                  >
                    Click to upload files
                  </Label>
                  <Input
                    id="file-upload"
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    PDF, DOC, DOCX, or images up to 10MB each
                  </p>
                  {files.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {files.map((file, index) => (
                        <div
                          key={index}
                          className="text-sm text-foreground bg-muted px-3 py-2 rounded-lg"
                        >
                          {file.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex justify-center pt-4">
              <Button
                type="submit"
                size="lg"
                disabled={isSubmitting}
                className="gap-2 min-w-[200px]"
              >
                {isSubmitting ? (
                  <>
                    <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Submit Onboarding Form
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default Onboarding;
