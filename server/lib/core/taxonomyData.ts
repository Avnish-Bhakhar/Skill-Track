export type Sector = "electrician" | "solar" | "retail";

export const SECTORS: Sector[] = ["electrician", "solar", "retail"];

export interface SkillSeed {
  id: string;
  name: string;
  aliases: string[];
  category: string;
  sector: Sector;
}

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function group(sector: Sector, category: string, rows: string[]): SkillSeed[] {
  return rows.map((row) => {
    const [name, ...aliases] = row.split("|");
    return { id: slug(name), name, aliases, category, sector };
  });
}

export const SKILLS: SkillSeed[] = [
  ...group("electrician", "Wiring", [
    "House wiring|domestic wiring|residential wiring",
    "Industrial wiring|factory wiring",
    "Conduit installation|conduit bending|conduit laying",
    "Cable jointing|cable splicing",
    "Cable sizing|wire gauge selection",
    "Switchboard assembly|switch board fitting",
    "Distribution board installation|db dressing|db installation",
    "Lighting installation|light fitting installation",
  ]),
  ...group("electrician", "Protection and testing", [
    "Earthing|grounding|earth pit",
    "MCB and RCCB selection|mcb fitting|rccb|elcb",
    "Insulation resistance testing|megger testing|megger",
    "Multimeter use|multimeter testing",
    "Fault finding|electrical troubleshooting|fault diagnosis",
    "Electrical safety|shock prevention",
    "Lockout tagout|loto",
  ]),
  ...group("electrician", "Machines and controls", [
    "Motor winding|rewinding",
    "Motor starter wiring|dol starter|star delta starter",
    "Control panel wiring|panel wiring",
    "PLC basics|programmable logic controller",
    "Transformer maintenance|transformer servicing",
    "DG set operation|diesel generator operation|genset",
    "Pump motor repair|pump repair",
    "Appliance repair|home appliance servicing",
    "Fan and cooler repair|ceiling fan repair",
    "UPS and battery maintenance|ups servicing",
  ]),
  ...group("electrician", "Workplace", [
    "Wiring diagram reading|circuit diagram reading|single line diagram",
    "Load calculation|connected load estimation",
    "Energy meter installation|meter fitting|smart meter installation",
    "Electrical estimation|material estimation",
    "Preventive maintenance|scheduled maintenance",
  ]),
  ...group("solar", "Site and design", [
    "Site survey|rooftop survey",
    "Shadow analysis|shading analysis",
    "Solar load assessment|load assessment|energy audit",
    "PV system sizing|system sizing|solar system design",
    "String design|string sizing",
    "Solar layout drawing|array layout",
  ]),
  ...group("solar", "Installation", [
    "Module mounting structure|mms installation|mounting structure",
    "PV module installation|solar panel installation|panel mounting",
    "DC cabling|dc wiring|solar dc cable",
    "MC4 connector crimping|mc4 crimping|mc4 connector",
    "AC side integration|ac cabling|grid side wiring",
    "Inverter installation|solar inverter mounting",
    "Inverter configuration|inverter commissioning|inverter settings|inverter programming|inverter parameter setup",
    "Battery bank setup|solar battery installation",
    "Charge controller setup|mppt controller|solar charge controller",
    "Solar earthing and lightning protection|lightning arrester|solar earthing",
    "Junction box wiring|array junction box|combiner box",
    "Roof waterproofing|roof penetration sealing",
  ]),
  ...group("solar", "Commissioning and service", [
    "System commissioning|plant commissioning",
    "Net metering|net meter application",
    "Remote monitoring setup|inverter monitoring|data logger setup",
    "IV curve testing|string testing",
    "Thermal imaging inspection|thermography",
    "Solar plant maintenance|solar om|solar panel maintenance",
    "Panel cleaning|module cleaning",
    "Solar troubleshooting|solar fault finding",
    "Work at height safety|height safety|fall protection",
    "Solar pump installation|solar water pump",
    "Subsidy documentation|rooftop subsidy paperwork",
    "Customer handover|handover documentation",
  ]),
  ...group("retail", "Selling", [
    "Customer greeting|greeting customers",
    "Need identification|understanding customer needs",
    "Product demonstration|product demo",
    "Upselling|up selling",
    "Cross selling|cross sell",
    "Objection handling|handling objections",
    "Sales closing|closing the sale",
    "Product knowledge|catalogue knowledge",
    "Customer follow up|customer follow-up calls",
    "Loyalty program enrolment|loyalty program|membership enrolment",
  ]),
  ...group("retail", "Billing and systems", [
    "POS billing|point of sale|billing counter|pos operation",
    "Cash handling|cash reconciliation",
    "UPI and card payments|digital payments|card swiping",
    "Returns and exchanges|exchange handling",
    "Invoice preparation|gst invoice",
    "Spreadsheet basics|excel basics|ms excel",
    "Inventory software|stock software|erp entry",
  ]),
  ...group("retail", "Store operations", [
    "Visual merchandising|product display",
    "Shelf replenishment|shelf filling|restocking",
    "Stock counting|stock taking|stock audit",
    "Receiving goods|goods inward",
    "Expiry and damage checks|fifo|expiry check",
    "Loss prevention|shrinkage control",
    "Store hygiene|housekeeping",
  ]),
  ...group("retail", "Communication", [
    "Spoken English|english communication",
    "Local language communication|marathi communication",
    "Complaint handling|grievance handling",
    "Telephone etiquette|phone manners",
    "Teamwork|team coordination",
    "Personal grooming|grooming standards",
  ]),
];
