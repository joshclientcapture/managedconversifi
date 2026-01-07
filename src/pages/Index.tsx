import IntegrationForm from "@/components/IntegrationForm";
import Header from "@/components/Header";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-8 px-4 sm:py-12 sm:px-6 lg:py-16">
        <div className="container max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8 sm:mb-12">
            <h1 className="text-3xl sm:text-4xl font-semibold text-foreground mb-3">
              Integration Hub
            </h1>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Seamlessly connect your client's services for automated workflow management
            </p>
          </div>

          {/* Form */}
          <IntegrationForm />
        </div>
      </main>
    </div>
  );
};

export default Index;
