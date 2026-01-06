import IntegrationForm from "@/components/IntegrationForm";

const Index = () => {
  return (
    <div className="min-h-screen py-8 px-4 sm:py-12 sm:px-6 lg:py-16">
      <div className="container max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
            Integration Hub
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Seamlessly connect your client's services for automated workflow management
          </p>
        </div>

        {/* Form */}
        <IntegrationForm />
      </div>
    </div>
  );
};

export default Index;
