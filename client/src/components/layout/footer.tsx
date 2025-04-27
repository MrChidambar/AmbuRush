import { Link } from "wouter";
import { Ambulance, MapPin, Phone, Mail } from "lucide-react";
import { FaFacebookF, FaTwitter, FaInstagram, FaLinkedinIn } from "react-icons/fa";

export function Footer() {
  return (
    <footer className="bg-gray-800 dark:bg-gray-900 text-white mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="text-2xl font-bold font-heading mb-4 flex items-center">
              <Ambulance className="mr-2 h-6 w-6" /> MediRush
            </div>
            <p className="text-gray-300 dark:text-gray-400 mb-4">
              Your trusted partner for emergency and non-emergency medical transportation services, available 24/7.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-300 hover:text-white transition-colors">
                <FaFacebookF />
              </a>
              <a href="#" className="text-gray-300 hover:text-white transition-colors">
                <FaTwitter />
              </a>
              <a href="#" className="text-gray-300 hover:text-white transition-colors">
                <FaInstagram />
              </a>
              <a href="#" className="text-gray-300 hover:text-white transition-colors">
                <FaLinkedinIn />
              </a>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Services</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/services">
                  <a className="text-gray-300 hover:text-white transition-colors">Emergency Services</a>
                </Link>
              </li>
              <li>
                <Link href="/services">
                  <a className="text-gray-300 hover:text-white transition-colors">Non-Emergency Transport</a>
                </Link>
              </li>
              <li>
                <Link href="/services">
                  <a className="text-gray-300 hover:text-white transition-colors">Hospital Transfers</a>
                </Link>
              </li>
              <li>
                <Link href="/services">
                  <a className="text-gray-300 hover:text-white transition-colors">Event Medical Coverage</a>
                </Link>
              </li>
              <li>
                <Link href="/services">
                  <a className="text-gray-300 hover:text-white transition-colors">Pet Ambulance Services</a>
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/">
                  <a className="text-gray-300 hover:text-white transition-colors">About Us</a>
                </Link>
              </li>
              <li>
                <Link href="/">
                  <a className="text-gray-300 hover:text-white transition-colors">Coverage Areas</a>
                </Link>
              </li>
              <li>
                <Link href="/">
                  <a className="text-gray-300 hover:text-white transition-colors">Pricing</a>
                </Link>
              </li>
              <li>
                <Link href="/">
                  <a className="text-gray-300 hover:text-white transition-colors">FAQs</a>
                </Link>
              </li>
              <li>
                <Link href="/">
                  <a className="text-gray-300 hover:text-white transition-colors">Contact Us</a>
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact</h3>
            <ul className="space-y-2">
              <li className="flex items-start">
                <MapPin className="mt-1 mr-3 h-4 w-4 text-primary" />
                <span>123 Medical Plaza, Cityville, State 12345</span>
              </li>
              <li className="flex items-center">
                <Phone className="mr-3 h-4 w-4 text-primary" />
                <span>Emergency: (911)</span>
              </li>
              <li className="flex items-center">
                <Phone className="mr-3 h-4 w-4 text-primary" />
                <span>Bookings: (800) 123-4567</span>
              </li>
              <li className="flex items-center">
                <Mail className="mr-3 h-4 w-4 text-primary" />
                <span>info@medirush.com</span>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-700 dark:border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400">&copy; {new Date().getFullYear()} MediRush Ambulance Services. All rights reserved.</p>
          <div className="mt-4 md:mt-0 flex space-x-6">
            <a href="#" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors">Accessibility</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
