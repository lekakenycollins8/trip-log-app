"use client"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function HelpPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Help & Regulations</h1>
      <p className="text-gray-600 mb-8">Learn about Hours of Service regulations and how to use this application</p>

      <Tabs defaultValue="hos">
        <TabsList className="mb-6">
          <TabsTrigger value="hos">HOS Regulations</TabsTrigger>
          <TabsTrigger value="app">Using the App</TabsTrigger>
          <TabsTrigger value="eld">ELD Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="hos">
          <Card>
            <CardHeader>
              <CardTitle>Hours of Service (HOS) Regulations</CardTitle>
              <CardDescription>
                Federal Motor Carrier Safety Administration (FMCSA) regulations for property-carrying drivers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger>11-Hour Driving Limit</AccordionTrigger>
                  <AccordionContent>
                    <p>May drive a maximum of 11 hours after 10 consecutive hours off duty.</p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-2">
                  <AccordionTrigger>14-Hour On-Duty Limit</AccordionTrigger>
                  <AccordionContent>
                    <p>
                      May not drive beyond the 14th consecutive hour after coming on duty, following 10 consecutive
                      hours off duty. Off-duty time does not extend the 14-hour period.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-3">
                  <AccordionTrigger>30-Minute Driving Break</AccordionTrigger>
                  <AccordionContent>
                    <p>
                      Drivers must take a 30-minute break when they have driven for a period of 8 cumulative hours
                      without at least a 30-minute interruption.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-4">
                  <AccordionTrigger>60/70-Hour On-Duty Limit</AccordionTrigger>
                  <AccordionContent>
                    <p>
                      May not drive after 60/70 hours on duty in 7/8 consecutive days. A driver may restart a 7/8
                      consecutive day period after taking 34 or more consecutive hours off duty.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-5">
                  <AccordionTrigger>Sleeper Berth Provision</AccordionTrigger>
                  <AccordionContent>
                    <p>
                      Drivers may split their required 10-hour off-duty period, as long as one off-duty period (whether
                      in or out of the sleeper berth) is at least 2 hours long, and the other involves at least 7
                      consecutive hours in the sleeper berth.
                    </p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="app">
          <Card>
            <CardHeader>
              <CardTitle>Using the Application</CardTitle>
              <CardDescription>Learn how to use the ELD Trip Planner effectively</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger>Creating a New Trip</AccordionTrigger>
                  <AccordionContent>
                    <ol className="list-decimal pl-5 space-y-2">
                      <li>Navigate to the Home page or click "New Trip" in the sidebar</li>
                      <li>Enter your current location, pickup location, and dropoff location</li>
                      <li>Enter your current cycle hours used (0-70)</li>
                      <li>Click "Create Trip" to generate your route and logs</li>
                    </ol>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-2">
                  <AccordionTrigger>Managing Stops</AccordionTrigger>
                  <AccordionContent>
                    <p className="mb-2">The system automatically generates stops based on these rules:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>1 hour for pickup and dropoff</li>
                      <li>Fueling stops every 1,000 miles</li>
                      <li>30-minute rest stops every 8 hours of driving</li>
                    </ul>
                    <p className="mt-2">You can also manually add stops on the Trip Details page.</p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-3">
                  <AccordionTrigger>Viewing and Printing Logs</AccordionTrigger>
                  <AccordionContent>
                    <p>
                      Navigate to the Log Sheet page to view your daily logs. You can print or download these logs by
                      clicking the "Print / Download" button. The system generates logs that comply with Hours of
                      Service regulations.
                    </p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="eld">
          <Card>
            <CardHeader>
              <CardTitle>ELD Logs Explained</CardTitle>
              <CardDescription>Understanding Electronic Logging Device (ELD) records</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger>Duty Statuses</AccordionTrigger>
                  <AccordionContent>
                    <ul className="space-y-2">
                      <li>
                        <strong>Off Duty:</strong> When you are not working and free from all responsibilities.
                      </li>
                      <li>
                        <strong>Sleeper Berth:</strong> Time spent resting in the sleeper berth compartment of your
                        truck.
                      </li>
                      <li>
                        <strong>Driving:</strong> When you are behind the wheel of a commercial motor vehicle.
                      </li>
                      <li>
                        <strong>On Duty (Not Driving):</strong> When you are working but not driving (loading,
                        unloading, inspections, etc.).
                      </li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-2">
                  <AccordionTrigger>Reading the Graph Grid</AccordionTrigger>
                  <AccordionContent>
                    <p>The ELD graph shows your activity over a 24-hour period:</p>
                    <ul className="list-disc pl-5 space-y-1 mt-2">
                      <li>The horizontal axis represents the 24 hours of the day</li>
                      <li>The vertical axis shows the four duty statuses</li>
                      <li>Colored bars indicate time spent in each status</li>
                      <li>The daily log summary shows total hours in each status</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-3">
                  <AccordionTrigger>FMCSA Compliance</AccordionTrigger>
                  <AccordionContent>
                    <p>
                      This application generates logs that comply with FMCSA regulations. However, it is ultimately the
                      driver's responsibility to ensure all records are accurate and complete. Always verify your logs
                      before submitting them officially.
                    </p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}