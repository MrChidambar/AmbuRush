import { useState } from "react";
import { useLocation } from "wouter";
import { EmergencyBanner } from "@/components/booking/emergency-banner";
import { BookingTypeSelector } from "@/components/booking/booking-type-selector";
import { EmergencyBookingForm } from "@/components/booking/emergency-booking-form";
import { NonEmergencyBookingForm } from "@/components/booking/non-emergency-booking-form";
import { BookingConfirmation } from "@/components/booking/booking-confirmation";
import { AmbulanceTracking } from "@/components/tracking/ambulance-tracking";
import { AppHeader } from "@/components/layout/app-header";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";

export default function HomePage() {
  const [bookingType, setBookingType] = useState<"emergency" | "non-emergency">("emergency");
  const [view, setView] = useState<"form" | "confirmation" | "tracking">("form");
  const [bookingId, setBookingId] = useState<number | null>(null);
  const [_, navigate] = useLocation();

  const handleBookingComplete = (id: number) => {
    setBookingId(id);
    setView("confirmation");
  };

  const handleViewTracking = (id: number) => {
    setBookingId(id);
    setView("tracking");
  };

  const renderCurrentView = () => {
    if (view === "form") {
      return bookingType === "emergency" ? (
        <EmergencyBookingForm onBookingComplete={handleBookingComplete} />
      ) : (
        <NonEmergencyBookingForm onBookingComplete={handleBookingComplete} />
      );
    } else if (view === "confirmation" && bookingId) {
      return <BookingConfirmation bookingId={bookingId} onViewTracking={handleViewTracking} />;
    } else if (view === "tracking" && bookingId) {
      return <AmbulanceTracking bookingId={bookingId} />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader />
      
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <EmergencyBanner />

          {view === "form" && (
            <BookingTypeSelector 
              bookingType={bookingType} 
              onBookingTypeChange={setBookingType} 
            />
          )}

          {renderCurrentView()}

          {/* Emergency Services Section */}
          {view === "form" && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">Our Emergency Services</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="overflow-hidden">
                  <div className="h-48 bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center p-6 text-white">
                    <div className="text-center">
                      <div className="rounded-full bg-white/20 p-3 inline-block mb-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"></path>
                          <path d="M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"></path>
                          <path d="M5 9h14m-4 0l2 8"></path>
                          <path d="M5 9l2 8"></path>
                          <path d="M8 6h8l1 3"></path>
                        </svg>
                      </div>
                      <h3 className="text-xl font-bold">Basic Life Support</h3>
                    </div>
                  </div>
                  <CardContent className="p-5">
                    <p className="text-gray-600 dark:text-gray-400 mb-4">For non-critical patients requiring basic medical monitoring during transport.</p>
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <div className="mr-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M16 7a4 4 0 1 1 -8 0a4 4 0 0 1 8 0z"></path>
                          <path d="M12 11v4"></path>
                          <path d="M10 16h4"></path>
                        </svg>
                        EMT Staff
                      </div>
                      <div>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 10h.01"></path>
                          <path d="M15 10h.01"></path>
                          <path d="M12 18.5l-3 -1.5"></path>
                          <path d="M12 18.5l3 -1.5"></path>
                          <path d="M17 18.5l-5 -3l-5 3"></path>
                          <path d="M12 6.5a3 3 0 0 0 -3 -3"></path>
                          <path d="M12 6.5a3 3 0 0 1 3 -3"></path>
                          <path d="M4 8l2.1 2.8"></path>
                          <path d="M20 8l-2.1 2.8"></path>
                          <path d="M12 2l0 4"></path>
                        </svg>
                        Basic Equipment
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="overflow-hidden">
                  <div className="h-48 bg-gradient-to-r from-primary to-orange-500 flex items-center justify-center p-6 text-white">
                    <div className="text-center">
                      <div className="rounded-full bg-white/20 p-3 inline-block mb-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M19.5 13.5l-7.5 7.5l-7.5 -7.5"></path>
                          <path d="M12 3l0 18"></path>
                        </svg>
                      </div>
                      <h3 className="text-xl font-bold">Advanced Life Support</h3>
                    </div>
                  </div>
                  <CardContent className="p-5">
                    <p className="text-gray-600 dark:text-gray-400 mb-4">Equipped for critical care with advanced medical equipment and paramedics.</p>
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <div className="mr-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M19.5 13.5l-7.5 7.5l-7.5 -7.5"></path>
                          <path d="M12 3l0 18"></path>
                        </svg>
                        Cardiac Care
                      </div>
                      <div>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 5h16"></path>
                          <path d="M4 9h16"></path>
                          <path d="M4 19h16"></path>
                          <path d="M4 15h8"></path>
                        </svg>
                        Advanced Support
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="overflow-hidden">
                  <div className="h-48 bg-gradient-to-r from-green-500 to-teal-500 flex items-center justify-center p-6 text-white">
                    <div className="text-center">
                      <div className="rounded-full bg-white/20 p-3 inline-block mb-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M8 9l4 0l0 -4"></path>
                          <path d="M6 4h4v4"></path>
                          <path d="M5 8v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-8a2 2 0 0 0 -2 -2h-2"></path>
                          <path d="M12 16l0 -4"></path>
                          <path d="M10 14l4 0"></path>
                        </svg>
                      </div>
                      <h3 className="text-xl font-bold">ICU on Wheels</h3>
                    </div>
                  </div>
                  <CardContent className="p-5">
                    <p className="text-gray-600 dark:text-gray-400 mb-4">Mobile intensive care unit for high-risk patients requiring critical care during transport.</p>
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <div className="mr-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 8v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-8a2 2 0 0 0 -2 -2h-10a2 2 0 0 0 -2 2z"></path>
                          <path d="M12 16v-8"></path>
                          <path d="M8 12h8"></path>
                        </svg>
                        ICU Equipment
                      </div>
                      <div>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M16 7a4 4 0 1 1 -8 0a4 4 0 0 1 8 0z"></path>
                          <path d="M12 11v4"></path>
                          <path d="M10 16h4"></path>
                        </svg>
                        Specialist Staff
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Customer Reviews Section */}
          {view === "form" && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Customer Reviews</h2>
                <div className="flex items-center">
                  <div className="flex items-center text-yellow-500">
                    {[1, 2, 3, 4].map((index) => (
                      <Star key={index} className="h-4 w-4 fill-current" />
                    ))}
                    <Star className="h-4 w-4 fill-current text-yellow-500/50" />
                  </div>
                  <span className="ml-2 text-gray-700 dark:text-gray-300 font-medium">4.8 out of 5</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border border-gray-100 dark:border-gray-800">
                  <CardContent className="p-5">
                    <div className="flex items-center mb-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-primary-100 dark:bg-primary-900 text-primary">JD</AvatarFallback>
                      </Avatar>
                      <div className="ml-4">
                        <div className="font-medium text-gray-900 dark:text-gray-100">John Doe</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">2 days ago</div>
                      </div>
                      <div className="ml-auto flex items-center text-yellow-500">
                        {[1, 2, 3, 4, 5].map((index) => (
                          <Star key={index} className="h-4 w-4 fill-current" />
                        ))}
                      </div>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400">
                      The emergency response was incredibly quick. The paramedics were professional and caring, making a stressful situation much easier to handle. Highly recommend this service!
                    </p>
                  </CardContent>
                </Card>

                <Card className="border border-gray-100 dark:border-gray-800">
                  <CardContent className="p-5">
                    <div className="flex items-center mb-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-secondary-100 dark:bg-secondary-900 text-secondary">SM</AvatarFallback>
                      </Avatar>
                      <div className="ml-4">
                        <div className="font-medium text-gray-900 dark:text-gray-100">Sarah Miller</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">1 week ago</div>
                      </div>
                      <div className="ml-auto flex items-center text-yellow-500">
                        {[1, 2, 3, 4].map((index) => (
                          <Star key={index} className="h-4 w-4 fill-current" />
                        ))}
                        <Star className="h-4 w-4 fill-current text-yellow-500/50" />
                      </div>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400">
                      Used the scheduled transport service for my father's regular hospital visits. The booking process was easy, and the staff was very helpful. The real-time tracking feature gave us peace of mind.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
