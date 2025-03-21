import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Menu, Zap } from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export default function Navbar() {
  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Zap className="h-5 w-5 text-orange-500" />
          <span className="font-semibold text-xl">Blink Fee Calculator</span>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex space-x-6">
          <Link href="/" className="text-gray-600 hover:text-orange-500 transition-colors">
            Home
          </Link>
          <Link href="/about" className="text-gray-600 hover:text-orange-500 transition-colors">
            About
          </Link>
          <Link href="/docs" className="text-gray-600 hover:text-orange-500 transition-colors">
            Documentation
          </Link>
        </nav>

        {/* Mobile Navigation */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right">
            <nav className="flex flex-col space-y-4 mt-8">
              <Link href="/" className="text-gray-600 hover:text-orange-500 transition-colors">
                Home
              </Link>
              <Link href="/about" className="text-gray-600 hover:text-orange-500 transition-colors">
                About
              </Link>
              <Link href="/docs" className="text-gray-600 hover:text-orange-500 transition-colors">
                Documentation
              </Link>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
