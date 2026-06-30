import { Switch, Route, Router as WouterRouter } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Docs from "@/pages/Docs";
import About from "@/pages/About";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

function Routes() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/docs" component={Docs} />
      <Route path="/about" component={About} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* Hash-based routing so the app works on static hosts (e.g. GitHub
          Pages) served from a subpath, without server-side rewrites. The
          whole shell is wrapped so Navbar/Footer links use the same hook. */}
      <WouterRouter hook={useHashLocation}>
        <div className="flex flex-col min-h-screen">
          <Navbar />
          <div className="flex-grow">
            <Routes />
          </div>
          <Footer />
        </div>
      </WouterRouter>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
