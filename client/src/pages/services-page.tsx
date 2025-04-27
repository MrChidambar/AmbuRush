import { AppHeader } from "@/components/layout/app-header";
import { Footer } from "@/components/layout/footer";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { 
  Ambulance, Heart, Baby, Building2, Brain, PawPrint, Calendar, 
  AlertTriangle, Clock, CheckCircle, DollarSign, Phone 
} from "lucide-react";

export default function ServicesPage() {
  const [_, navigate] = useLocation();

  const ambulanceTypes = [
    {
      id: "bls",
      name: "Basic Life Support",
      icon: <Ambulance className="h-8 w-8" />,
      description: "Non-critical patient transport with basic medical monitoring equipment.",
      features: [
        "Basic medical monitoring equipment",
        "Trained Emergency Medical Technicians (EMTs)",
        "Oxygen administration",
        "First aid supplies",
        "Suitable for stable patients"
      ],
      idealFor: "Medical appointments, hospital discharges, inter-facility transfers for stable patients",
      priceRange: "$50-$100 base + $2/km"
    },
    {
      id: "als",
      name: "Advanced Life Support",
      icon: <Heart className="h-8 w-8" />,
      description: "For patients requiring advanced medical care during transport.",
      features: [
        "Advanced cardiac monitoring",
        "IV administration capabilities",
        "Advanced airway management",
        "Paramedics in addition to EMTs",
        "Medications for emergency treatment"
      ],
      idealFor: "Cardiac patients, respiratory distress, trauma cases, emergency response",
      priceRange: "$150-$250 base + $3/km"
    },
    {
      id: "neo",
      name: "Neonatal Transport",
      icon: <Baby className="h-8 w-8" />,
      description: "Specialized transport for newborns requiring intensive care.",
      features: [
        "Neonatal incubator",
        "Specialized neonatal equipment",
        "Neonatal respiratory support",
        "Temperature control systems",
        "Neonatal specialists on board"
      ],
      idealFor: "Premature babies, neonates requiring specialized care, NICU transfers",
      priceRange: "$200-$300 base + $3.50/km"
    },
    {
      id: "icu",
      name: "ICU on Wheels",
      icon: <Building2 className="h-8 w-8" />,
      description: "Mobile intensive care unit for critical patients during transport.",
      features: [
        "Full ICU equipment suite",
        "Ventilator support",
        "Critical care monitoring",
        "ICU specialist on board",
        "Blood gas analysis capabilities"
      ],
      idealFor: "Critical care patients, ventilator-dependent patients, complex medical cases",
      priceRange: "$300-$500 base + $4/km"
    },
    {
      id: "mental",
      name: "Mental Health Transport",
      icon: <Brain className="h-8 w-8" />,
      description: "Specialized transport with mental health professionals.",
      features: [
        "Secure patient compartment",
        "Mental health specialists",
        "De-escalation trained staff",
        "Comfortable environment",
        "Privacy considerations"
      ],
      idealFor: "Psychiatric patients, behavioral health transfers, crisis situations",
      priceRange: "$150-$250 base + $2.50/km"
    },
    {
      id: "pet",
      name: "Pet Ambulance",
      icon: <PawPrint className="h-8 w-8" />,
      description: "Emergency transport for pets requiring immediate veterinary care.",
      features: [
        "Veterinary first aid equipment",
        "Oxygen therapy for animals",
        "Animal restraint systems",
        "Temperature control",
        "Trained in animal handling"
      ],
      idealFor: "Injured pets, emergency veterinary care, pet hospital transfers",
      priceRange: "$100-$200 base + $2/km"
    }
  ];

  const faqs = [
    {
      question: "How quickly will an ambulance arrive in an emergency?",
      answer: "For emergency bookings, our target response time is 5-10 minutes in urban areas and 10-20 minutes in rural areas, depending on traffic conditions and distance. Our system automatically dispatches the nearest available ambulance to minimize response time."
    },
    {
      question: "How do I schedule a non-emergency ambulance?",
      answer: "Non-emergency ambulances can be scheduled through our app or website. You'll need to provide the pickup location, destination, preferred date and time, patient details, and select the appropriate ambulance type. You can schedule transports from 2 hours to 7 days in advance."
    },
    {
      question: "What information do I need to provide when booking an ambulance?",
      answer: "You'll need to provide patient details (name, age, condition), pickup location, destination (if applicable), emergency contact information, and any relevant medical history. For scheduled bookings, you'll also need to specify the date and time."
    },
    {
      question: "How is the fare calculated?",
      answer: "Our fares consist of a base charge plus a per-kilometer rate. The base charge varies depending on the type of ambulance service required. Additional charges may apply for specialized equipment or services. You'll receive a fare estimate before confirming your booking."
    },
    {
      question: "What payment methods are accepted?",
      answer: "We accept credit/debit cards, UPI payments, and insurance coverage where applicable. Payment can be made through the app, website, or directly to the crew upon service completion."
    },
    {
      question: "Is my insurance accepted?",
      answer: "We work with most major insurance providers. You can enter your insurance information during booking, and we'll verify coverage before the service. For emergency services, treatment is provided regardless of insurance status."
    },
    {
      question: "Can family members accompany the patient?",
      answer: "In most cases, one family member may accompany the patient in the ambulance, space permitting. This may vary based on the patient's condition and the type of ambulance service."
    },
    {
      question: "What if I need to cancel a scheduled booking?",
      answer: "Non-emergency bookings can be cancelled through the app or website. Cancellations made at least 4 hours before the scheduled time are free of charge. Later cancellations may incur a nominal fee."
    }
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader />
      
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Hero Section */}
          <div className="mb-12 text-center">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Our Ambulance Services
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Professional medical transportation services for emergency and non-emergency situations, 
              available 24/7 with trained medical staff.
            </p>
          </div>
          
          {/* Service Types Tab */}
          <Tabs defaultValue="services" className="mb-12">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="services" className="text-base py-3">
                <AlertTriangle className="mr-2 h-4 w-4" /> Emergency & Non-Emergency Services
              </TabsTrigger>
              <TabsTrigger value="ambulances" className="text-base py-3">
                <Ambulance className="mr-2 h-4 w-4" /> Ambulance Types
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="services">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Emergency Services */}
                <Card className="overflow-hidden border-l-4 border-primary">
                  <div className="bg-primary p-4 flex items-center">
                    <AlertTriangle className="h-6 w-6 text-white mr-2" /> 
                    <h2 className="text-xl font-bold text-white">Emergency Services</h2>
                  </div>
                  <CardContent className="pt-6">
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      Our emergency ambulance services provide immediate medical response for life-threatening situations. 
                      Available 24/7, our ambulances are equipped with advanced medical equipment and staffed by 
                      trained paramedics.
                    </p>
                    
                    <div className="space-y-4">
                      <div className="flex">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                        <div>
                          <h3 className="font-medium">Immediate Response</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Our ambulances are strategically located to ensure rapid response times.
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                        <div>
                          <h3 className="font-medium">Advanced Life Support</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Equipped with cardiac monitors, defibrillators, and life-saving medications.
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                        <div>
                          <h3 className="font-medium">Trained Medical Professionals</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Staffed by certified paramedics and emergency medical technicians.
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                        <div>
                          <h3 className="font-medium">Hospital Coordination</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Direct communication with emergency departments for seamless handoffs.
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="bg-gray-50 dark:bg-gray-900 px-6 py-4">
                    <div className="flex justify-between items-center w-full">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 text-primary mr-2" />
                        <span className="text-sm">Avg. Response: 5-10 minutes</span>
                      </div>
                      <Button 
                        variant="destructive"
                        onClick={() => navigate("/")}
                      >
                        Book Emergency
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
                
                {/* Non-Emergency Services */}
                <Card className="overflow-hidden border-l-4 border-secondary">
                  <div className="bg-secondary p-4 flex items-center">
                    <Calendar className="h-6 w-6 text-white mr-2" /> 
                    <h2 className="text-xl font-bold text-white">Non-Emergency Services</h2>
                  </div>
                  <CardContent className="pt-6">
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      Our scheduled transport services provide comfortable and safe transportation for non-emergency 
                      medical needs. Ideal for hospital discharges, inter-facility transfers, and medical appointments.
                    </p>
                    
                    <div className="space-y-4">
                      <div className="flex">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                        <div>
                          <h3 className="font-medium">Flexible Scheduling</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Book in advance from 2 hours to 7 days with your preferred time slot.
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                        <div>
                          <h3 className="font-medium">Comfortable Transport</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Designed for patient comfort with climate control and smooth rides.
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                        <div>
                          <h3 className="font-medium">Trained Attendants</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Professional medical staff to assist with patient needs during transport.
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                        <div>
                          <h3 className="font-medium">Recurring Bookings</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Set up regular transports for ongoing medical appointments.
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="bg-gray-50 dark:bg-gray-900 px-6 py-4">
                    <div className="flex justify-between items-center w-full">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-secondary mr-2" />
                        <span className="text-sm">Schedule 2hrs-7days in advance</span>
                      </div>
                      <Button 
                        variant="secondary"
                        onClick={() => navigate("/")}
                      >
                        Schedule Transport
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="ambulances">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {ambulanceTypes.map((type) => (
                  <Card key={type.id} className="overflow-hidden">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="bg-primary-100 dark:bg-primary-900 p-2 rounded-md">
                          <div className="text-primary">
                            {type.icon}
                          </div>
                        </div>
                        <Badge 
                          variant={type.id === "bls" || type.id === "als" ? "default" : "outline"}
                          className="ml-2"
                        >
                          {type.id === "bls" || type.id === "als" ? "Popular" : type.id}
                        </Badge>
                      </div>
                      <CardTitle className="mt-4">{type.name}</CardTitle>
                      <CardDescription>
                        {type.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Key Features:</p>
                      <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-300 mb-4">
                        {type.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start">
                            <CheckCircle className="h-3.5 w-3.5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                      
                      <div className="mt-4 text-sm">
                        <p className="font-medium text-gray-700 dark:text-gray-300">Ideal for:</p>
                        <p className="text-gray-600 dark:text-gray-400">{type.idealFor}</p>
                      </div>
                      
                      <div className="mt-4 flex items-center">
                        <DollarSign className="h-4 w-4 text-primary mr-1" />
                        <p className="text-primary font-medium">{type.priceRange}</p>
                      </div>
                    </CardContent>
                    <CardFooter className="bg-gray-50 dark:bg-gray-900 pt-2">
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => navigate("/")}
                      >
                        Book {type.name}
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
          
          {/* Stats Section */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-4xl font-bold text-primary mb-2">24/7</div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Service Availability
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-4xl font-bold text-primary mb-2">5-10</div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Minutes Average Response
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-4xl font-bold text-primary mb-2">99.8%</div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  On-Time Arrival Rate
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-4xl font-bold text-primary mb-2">4.9</div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Customer Rating
                </p>
              </CardContent>
            </Card>
          </div>
          
          {/* Call to Action */}
          <Card className="mb-12 bg-gradient-to-r from-primary-50 to-secondary-50 dark:from-primary-950 dark:to-secondary-950 border-none">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row items-center justify-between">
                <div className="mb-6 md:mb-0">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                    Need Emergency Assistance?
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    Our emergency ambulance services are available 24/7. Don't hesitate to call for immediate assistance.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button 
                    variant="destructive" 
                    size="lg"
                    className="text-lg font-semibold"
                    onClick={() => window.open('tel:911')}
                  >
                    <Phone className="mr-2 h-5 w-5" />
                    Call 911
                  </Button>
                  <Button 
                    size="lg"
                    className="text-lg font-semibold"
                    onClick={() => navigate("/")}
                  >
                    <Ambulance className="mr-2 h-5 w-5" />
                    Book Ambulance
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* FAQ Section */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">
              Frequently Asked Questions
            </h2>
            
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left font-medium">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-600 dark:text-gray-400">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
          
          {/* Contact Section */}
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">
              Contact Us
            </h2>
            
            <Card>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-medium mb-4">Get in Touch</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      For inquiries, feedback, or assistance with our ambulance services, please contact us using the information below:
                    </p>
                    
                    <div className="space-y-4">
                      <div className="flex items-start">
                        <Phone className="h-5 w-5 text-primary mr-3 mt-0.5" />
                        <div>
                          <p className="font-medium">Emergency:</p>
                          <p className="text-gray-600 dark:text-gray-400">911</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start">
                        <Phone className="h-5 w-5 text-primary mr-3 mt-0.5" />
                        <div>
                          <p className="font-medium">Non-Emergency Bookings:</p>
                          <p className="text-gray-600 dark:text-gray-400">(800) 123-4567</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start">
                        <Mail className="h-5 w-5 text-primary mr-3 mt-0.5" />
                        <div>
                          <p className="font-medium">Email:</p>
                          <p className="text-gray-600 dark:text-gray-400">info@medirush.com</p>
                        </div>
                      </div>
                    </div>
                    
                    <Separator className="my-6" />
                    
                    <div>
                      <h4 className="font-medium mb-2">Operating Hours</h4>
                      <p className="text-gray-600 dark:text-gray-400 mb-1">
                        <span className="font-medium">Emergency Services:</span> 24/7, 365 days a year
                      </p>
                      <p className="text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Customer Support:</span> Monday to Sunday, 8:00 AM - 8:00 PM
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg">
                    <h3 className="text-lg font-medium mb-4">Request Information</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                      Have a question about our services? Fill out the form below and our team will get back to you as soon as possible.
                    </p>
                    
                    <div className="space-y-4">
                      <Button 
                        className="w-full" 
                        variant="secondary"
                        onClick={() => navigate("/")}
                      >
                        Book an Ambulance Now
                      </Button>
                      
                      <div className="text-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400">or</p>
                      </div>
                      
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => window.open('tel:8001234567')}
                      >
                        <Phone className="mr-2 h-4 w-4" />
                        Call Customer Support
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
