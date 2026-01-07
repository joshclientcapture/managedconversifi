import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const formData = await req.formData();
    
    // Extract form fields
    const submissionData = {
      first_name: formData.get("firstName") as string,
      last_name: formData.get("lastName") as string,
      company_name: formData.get("companyName") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      linkedin_url: formData.get("linkedinUrl") as string,
      website_url: formData.get("websiteUrl") as string,
      industry: formData.get("industry") as string,
      has_calendly: formData.get("hasCalendly") as string,
      country: formData.get("country") as string,
      street_address: formData.get("streetAddress") as string,
      city_state: formData.get("cityState") as string,
      ideal_client: formData.get("idealClient") as string || null,
      company_headcounts: JSON.parse(formData.get("companyHeadcounts") as string || "[]"),
      geography: formData.get("geography") as string || null,
      industries: formData.get("industries") as string || null,
      job_titles: formData.get("jobTitles") as string || null,
      problem_solved: formData.get("problemSolved") as string || null,
      service_description: formData.get("serviceDescription") as string || null,
      success_stories: formData.get("successStories") as string || null,
      deal_size: formData.get("dealSize") as string || null,
      sales_person: formData.get("salesPerson") as string || null,
      blacklist_urls: formData.get("blacklistUrls") as string || null,
      file_urls: [] as string[],
    };

    // Validate required fields
    const requiredFields = [
      "first_name", "last_name", "company_name", "email", "phone",
      "linkedin_url", "website_url", "industry", "has_calendly",
      "country", "street_address", "city_state"
    ];

    for (const field of requiredFields) {
      if (!submissionData[field as keyof typeof submissionData]) {
        return new Response(
          JSON.stringify({ error: `Missing required field: ${field}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Handle file uploads
    const files: File[] = [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("file_") && value instanceof File) {
        files.push(value);
      }
    }

    console.log(`Processing onboarding for ${submissionData.company_name} with ${files.length} files`);

    // Upload files to storage
    const uploadedUrls: string[] = [];
    for (const file of files) {
      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const filePath = `${submissionData.company_name.replace(/[^a-zA-Z0-9]/g, "_")}/${timestamp}_${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("onboarding-files")
        .upload(filePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error("File upload error:", uploadError);
        // Continue with other files even if one fails
      } else {
        uploadedUrls.push(filePath);
        console.log(`Uploaded file: ${filePath}`);
      }
    }

    submissionData.file_urls = uploadedUrls;

    // Insert into database
    const { data, error: insertError } = await supabase
      .from("onboarding_submissions")
      .insert(submissionData)
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to save submission" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Onboarding submission saved with ID: ${data.id}`);

    // Send webhook with form data (excluding files)
    const webhookPayload = {
      id: data.id,
      first_name: submissionData.first_name,
      last_name: submissionData.last_name,
      company_name: submissionData.company_name,
      email: submissionData.email,
      phone: submissionData.phone,
      linkedin_url: submissionData.linkedin_url,
      website_url: submissionData.website_url,
      industry: submissionData.industry,
      has_calendly: submissionData.has_calendly,
      country: submissionData.country,
      street_address: submissionData.street_address,
      city_state: submissionData.city_state,
      ideal_client: submissionData.ideal_client,
      company_headcounts: submissionData.company_headcounts,
      geography: submissionData.geography,
      industries: submissionData.industries,
      job_titles: submissionData.job_titles,
      problem_solved: submissionData.problem_solved,
      service_description: submissionData.service_description,
      success_stories: submissionData.success_stories,
      deal_size: submissionData.deal_size,
      sales_person: submissionData.sales_person,
      blacklist_urls: submissionData.blacklist_urls,
    };

    try {
      const webhookResponse = await fetch(
        "https://conversifi-u38982.vm.elestio.app/webhook/34f8b282-4b4b-464c-bd6d-4dfd285616d1",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(webhookPayload),
        }
      );
      console.log(`Webhook sent, status: ${webhookResponse.status}`);
    } catch (webhookError) {
      console.error("Webhook error (non-blocking):", webhookError);
    }

    return new Response(
      JSON.stringify({ success: true, id: data.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const error = err as Error;
    console.error("Error in submit-onboarding:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
