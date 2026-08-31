export const pickupOptions = [
  { icon: '🏠', title: 'Home', text: 'We’ll come to you' },
  { icon: '🏢', title: 'Office', text: 'Work while we care' },
  { icon: '🎬', title: 'Theatre', text: 'Enjoy your movie' },
];

export const services = [
  { icon: '🏍', title: 'Foam & Water Wash', text: 'Deep exterior cleaning with careful drying.' },
  { icon: '🏍', title: 'Chain Cleaning', text: 'Chain cleaning and lubrication for smoother riding.' },
  { icon: '🏍', title: 'Polishing', text: 'Bring back a cleaner and fresher finish.' },
  { icon: '🏍', title: 'Tyre & Wheel Care', text: 'Wheel cleaning and tyre dressing.' },
  { icon: '🏍', title: 'Helmet Cleaning', text: 'Freshen up your helmet and riding gear.' },
  { icon: '🏍', title: 'Basic Inspection', text: 'Simple visual checks and service notes.' },
  { icon: '🏍', title: 'Deep Cleaning', text: 'Extra cleaning for heavily soiled bikes.' },
  { icon: '🏍', title: 'More Services', text: 'Additional bike-care services coming soon.' },
];

export const reasons = [
  {
    icon: '👨‍🔧',
    title: 'Trained Mechanics',
    text: 'Your bike is handled by trained professionals who understand proper bike care.',
  },
  {
    icon: '❤️',
    title: 'Handled With Care',
    text: 'We handle every bike with the same care and attention we would give our own.',
  },
  {
    icon: '🚚',
    title: 'Doorstep Convenience',
    text: 'No need to ride to a service centre or wait around for your bike.',
  },
  {
    icon: '⚡',
    title: 'Save Your Time',
    text: 'Spend your time on what matters while we take care of your bike.',
  },
];

export const plans = [
  {
    name: 'Basic Wash',
    price: 199,
    tag: null,
    features: ['Pickup & delivery', 'Foam + water wash', 'Drying', 'Tyre cleaning'],
    button: 'Choose Basic',
    buttonClass: 'secondary',
  },
  {
    name: 'Premium Care',
    price: 299,
    tag: 'Most Popular',
    features: ['Everything in Basic', 'Chain cleaning', 'Chain lubrication', 'Tyre dressing', 'Plastic care'],
    button: 'Choose Premium',
    buttonClass: 'primary',
  },
  {
    name: 'Bike Care',
    price: 499,
    tag: null,
    features: ['Deep cleaning', 'Chain service', 'Polishing', 'Helmet cleaning', 'Basic inspection'],
    button: 'Choose Bike Care',
    buttonClass: 'secondary',
  },
  {
    name: 'Monthly Subscription',
    price: 599,
    tag: 'Best Value',
    features: ['2 pickup & delivery washes', '2 chain clean + lube services', 'Priority booking', 'Digital bike-care history'],
    button: 'Choose Monthly',
    buttonClass: 'primary',
  },
];

export const membership = {
  title: 'Monthly Bike Care',
  price: 599,
  features: ['2 pickup & delivery washes', '2 chain clean + lube services', 'Priority booking', 'Digital bike-care history'],
};

export const steps = [
  { number: '1', title: 'Book Pickup', text: 'Open Bike Doctor and start your booking.' },
  { number: '2', title: 'Enter Details', text: 'Add your name, mobile, location and landmark.' },
  { number: '3', title: 'Select Slot', text: 'Choose your preferred pickup time.' },
  { number: '4', title: 'Select Plan', text: 'Choose the bike-care package you need.' },
  { number: '5', title: 'We Take Care', text: 'We pick up, service and deliver your bike.' },
];

export const faqs = [
  { q: 'Where can you pick up my bike?', a: 'We currently provide pickup from Home, Office and Theatre locations.' },
  { q: 'How much is pickup and delivery?', a: 'Up to 5 km: ₹20. Up to 10 km: ₹35. Up to 15 km: ₹50.' },
  { q: 'How long does the service take?', a: 'Our target is delivery within 1.5 hours of pickup, depending on the selected service, location and operating conditions.' },
  { q: 'Can I book during a movie?', a: 'Yes. Select Theatre as your pickup location and provide the theatre and landmark details.' },
  { q: 'How do I contact Bike Doctor?', a: 'You can contact us directly through the WhatsApp button at the bottom of the website.' },
];

export const charges = [
  { label: 'Up to 5 km', value: '₹20' },
  { label: 'Up to 10 km', value: '₹35' },
  { label: 'Up to 15 km', value: '₹50' },
];
