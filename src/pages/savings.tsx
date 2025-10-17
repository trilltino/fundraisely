/**
 * SAVINGS.TSX - Value Proposition and Cost Savings Page
 *
 * This is a marketing-focused informational page that quantifies the financial and operational
 * value of using the Fundraisely platform. It breaks down five specific categories where event
 * organizers save time, money, and stress by using Fundraisely instead of managing fundraising
 * events manually. The page uses a before-and-after comparison format to clearly demonstrate ROI.
 *
 * ROLE IN THE APPLICATION:
 * - Educational content section embedded within the landing page
 * - Provides concrete value propositions with estimated savings figures
 * - Addresses cost objections by showing clear return on investment
 * - Explains the broader value beyond just gaming functionality
 * - Serves as social proof and credibility builder for potential customers
 * - Positions Fundraisely as a comprehensive compliance and admin solution
 *
 * PAGE INTEGRATION:
 * - Imported and rendered within Landing.tsx (Landing page component)
 * - Appears after the FAQ section and before the CTA section
 * - Part of the larger landing page scroll experience
 * - Seamlessly integrated into landing page's gradient background
 * - Contributes to the overall conversion funnel
 *
 * CONTENT STRUCTURE:
 * The page is organized into five value categories, each following a consistent format:
 *
 * 1. Legal & Compliance Savings (€100-€250 per event):
 *    - Automated legal status determination
 *    - Pre-filled Garda permits and court licence templates
 *    - Built-in regulatory thresholds and exemptions
 *    - Deadline and renewal reminders
 *
 * 2. Admin & Paperwork Savings (€50-€150 per event):
 *    - Auto-generated logs (ticket sales, prizes, beneficiaries)
 *    - Event templates and digital ticketing
 *    - Post-event audit reports and income tracking
 *    - Eliminates manual spreadsheet management
 *
 * 3. Setup & Tooling Savings (€50-€500 depending on complexity):
 *    - Built-in tools for bingo cards, raffle tickets, quiz scoring
 *    - Hosted event pages (no separate website needed)
 *    - Cash and card payment tracking
 *    - Replaces multiple third-party tools (Eventbrite, Google Forms)
 *
 * 4. Transparency & Continuity (Qualitative value):
 *    - Timestamped event logs for permanent records
 *    - Multi-user access with role-based permissions
 *    - Exportable PDF compliance reports
 *    - Optional blockchain-anchored proof of transparency
 *    - Smooth volunteer handovers
 *
 * 5. Peace of Mind & Reputation (Qualitative value):
 *    - Live compliance dashboard (Red/Yellow/Green status)
 *    - Templates for all legal requirements
 *    - Reduced compliance risk
 *    - Enhanced donor trust and organizational credibility
 *
 * DESIGN PATTERNS:
 * - Consistent card-based layout for each category
 * - "Without FundRaisely" vs "With FundRaisely" comparison format
 * - Estimated savings highlighted in indigo accent boxes
 * - Numbered sections (1-5) for easy reference
 * - Bulleted lists for feature breakdowns
 * - Two-column grid on desktop, single column on mobile
 *
 * TARGET AUDIENCE:
 * - Community organizations and charities in Ireland
 * - Event organizers concerned about legal compliance
 * - Volunteer coordinators managing fundraising events
 * - Organizations running raffles, bingo nights, quiz nights
 * - Groups dealing with Gaming and Lotteries Act requirements
 *
 * REGULATORY CONTEXT:
 * This page specifically addresses pain points related to Irish fundraising regulations:
 * - Gaming and Lotteries Act compliance
 * - Garda permit requirements
 * - District Court lottery licences
 * - Prize value thresholds and caps
 * - Beneficiary reporting requirements
 * These regulations create significant administrative burden that Fundraisely addresses.
 *
 * VALUE MESSAGING:
 * - Positions Fundraisely as more than gaming software (legal co-pilot)
 * - Emphasizes time savings and stress reduction
 * - Quantifies financial ROI with specific euro amounts
 * - Highlights risk mitigation and compliance confidence
 * - Promotes long-term organizational benefits (continuity, reputation)
 *
 * UI/UX CONSIDERATIONS:
 * - Skippable content (within scrollable landing page)
 * - Scannable layout with clear headings and sections
 * - Visual hierarchy guides eye through comparison
 * - Accent boxes draw attention to savings figures
 * - Responsive design adapts to mobile viewing
 *
 * STYLING:
 * - Gradient background (indigo-50 to white)
 * - White elevated cards with rounded corners and shadows
 * - Indigo accent colors for savings callouts
 * - Consistent spacing and typography
 * - Grid layout for desktop, stacks on mobile
 *
 * DEPENDENCIES:
 * - React FC type annotation
 * - Tailwind CSS for styling
 *
 * SEO & CONTENT STRATEGY:
 * - Content optimized for fundraising compliance keywords
 * - Addresses common search queries (e.g., "Garda permit for raffle")
 * - Builds authority on Irish fundraising regulations
 * - Supports inbound marketing and content marketing strategy
 *
 * FUTURE ENHANCEMENTS:
 * - Add testimonials from organizations using the platform
 * - Include case studies with real savings examples
 * - Add calculator tool for personalized savings estimation
 * - Integrate CTA buttons for specific user types
 * - Add comparison table against manual process
 */

import React from 'react';

const FundRaiselyWhereYouSave: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white pb-20">
     
      
      {/* Hero Section */}
      <div className="container mx-auto px-4 max-w-4xl pt-16 pb-12">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-800 mb-6">
             Where You Save with FundRaisely
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            FundRaisely isn't just fundraising software — it's your <strong>legal, logistical, and admin co-pilot</strong>. 
            Here's where you save money, time, and stress on every event.
          </p>
        </div>

        {/* Main Content */}
        <div className="space-y-12">
          {/* Legal & Compliance Savings */}
          <div className="bg-white p-8 rounded-xl shadow-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">[COMPLETE] 1. Legal & Compliance Savings</h2>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="font-semibold text-gray-700 mb-3">Without FundRaisely:</h3>
                <p className="text-gray-600">You'd spend hours researching complex regulations or even pay for legal help.</p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-700 mb-3">With FundRaisely:</h3>
                <ul className="text-gray-600 space-y-2">
                  <li>• Instant legal status based on your answers</li>
                  <li>• Auto-filled Garda permit and court licence templates</li>
                  <li>• Built-in thresholds, prize caps, and exemptions</li>
                  <li>• Automatic reminders for deadlines and renewals</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-indigo-50 rounded-lg">
              <p className="text-indigo-800 font-medium">[IDEA] Estimated Savings: €100–€250 per event in legal fees and admin time</p>
            </div>
          </div>

          {/* Admin & Paperwork Savings */}
          <div className="bg-white p-8 rounded-xl shadow-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-6"> 2. Admin & Paperwork Savings</h2>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="font-semibold text-gray-700 mb-3">Without FundRaisely:</h3>
                <p className="text-gray-600">You manage messy spreadsheets, ticket logs, and reports manually.</p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-700 mb-3">With FundRaisely:</h3>
                <ul className="text-gray-600 space-y-2">
                  <li>• Auto-generated logs for ticket sales, prize value, and beneficiaries</li>
                  <li>• Event templates and digital ticketing included</li>
                  <li>• Post-event audit and income reporting automation</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-indigo-50 rounded-lg">
              <p className="text-indigo-800 font-medium">[IDEA] Estimated Savings: €50–€150 in volunteer time per event</p>
            </div>
          </div>

          {/* Setup & Tooling Savings */}
          <div className="bg-white p-8 rounded-xl shadow-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">️ 3. Setup & Tooling Savings</h2>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="font-semibold text-gray-700 mb-3">Without FundRaisely:</h3>
                <p className="text-gray-600">You might need Eventbrite, Google Forms, or even hire a designer.</p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-700 mb-3">With FundRaisely:</h3>
                <ul className="text-gray-600 space-y-2">
                  <li>• Built-in tools for bingo cards, raffle ticketing, and quiz scoring</li>
                  <li>• Hosted event pages and checkouts — no website needed</li>
                  <li>• Cash and card buyer tracking included</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-indigo-50 rounded-lg">
              <p className="text-indigo-800 font-medium">[IDEA] Estimated Savings: €50–€500 depending on complexity</p>
            </div>
          </div>

          {/* Transparency & Continuity */}
          <div className="bg-white p-8 rounded-xl shadow-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-6"> 4. Transparency & Continuity</h2>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="font-semibold text-gray-700 mb-3">Without FundRaisely:</h3>
                <p className="text-gray-600">No permanent records, risk of compliance failure, and disjointed volunteer handovers.</p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-700 mb-3">With FundRaisely:</h3>
                <ul className="text-gray-600 space-y-2">
                  <li>• Timestamped event logs</li>
                  <li>• Multi-user access with role permissions</li>
                  <li>• Exportable PDF compliance reports</li>
                  <li>• Blockchain-anchored proof of transparency (optional)</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-indigo-50 rounded-lg">
              <p className="text-indigo-800 font-medium">[IDEA] Value: Legal confidence + audit readiness</p>
            </div>
          </div>

          {/* Peace of Mind & Reputation */}
          <div className="bg-white p-8 rounded-xl shadow-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-6"> 5. Peace of Mind & Reputation</h2>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="font-semibold text-gray-700 mb-3">Without FundRaisely:</h3>
                <p className="text-gray-600">You're guessing if you're compliant.</p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-700 mb-3">With FundRaisely:</h3>
                <ul className="text-gray-600 space-y-2">
                  <li>• Live visual compliance dashboard (Red / Yellow / Green)</li>
                  <li>• Templates for all legal steps</li>
                  <li>• Safer events, happier teams, more trust from donors</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-indigo-50 rounded-lg">
              <p className="text-indigo-800 font-medium">[IDEA] Value: Event security + long-term credibility</p>
            </div>
          </div>

          {/* Pricing Section */}
        
        </div>
      </div>

     
    </div>
  );
};

export default FundRaiselyWhereYouSave;