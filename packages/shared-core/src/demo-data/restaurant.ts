export type Restaurant = {
  id: string; name: string; rating: number; deliveryTime: string; distance: string;
  cuisines: string[]; offer?: string; isPromoted?: boolean; imageUrl?: string;
  services: ('delivery' | 'takeaway' | 'dine-in' | 'table-booking')[];
  isOpen: boolean; costForTwo: string;
};

export const MOCK_RESTAURANTS: Restaurant[] = [
  { id: 'rest-1', name: 'Burger King', rating: 4.2, deliveryTime: '20-25 min', distance: '1.5 km', cuisines: ['American', 'Fast Food', 'Burgers'], offer: '60% OFF up to ₹120', isPromoted: true, services: ['delivery', 'takeaway', 'dine-in'], isOpen: true, costForTwo: '₹300' },
  { id: 'rest-2', name: "Domino's Pizza", rating: 4.5, deliveryTime: '30 min', distance: '2.1 km', cuisines: ['Pizzas', 'Italian', 'Fast Food'], offer: 'Flat ₹150 OFF', services: ['delivery', 'takeaway'], isOpen: true, costForTwo: '₹500' },
  { id: 'rest-3', name: 'Biryani Blues', rating: 4.6, deliveryTime: '35-40 min', distance: '3.8 km', cuisines: ['Biryani', 'North Indian', 'Mughlai'], services: ['delivery', 'takeaway', 'dine-in', 'table-booking'], isOpen: true, costForTwo: '₹600' },
  { id: 'rest-4', name: 'Healthy Cravings', rating: 4.8, deliveryTime: '25-30 min', distance: '1.2 km', cuisines: ['Healthy Food', 'Salads', 'Keto'], offer: '20% OFF', services: ['delivery', 'takeaway', 'dine-in'], isOpen: true, costForTwo: '₹450' },
  { id: 'rest-5', name: 'Sushi Kingdom', rating: 4.9, deliveryTime: '40 min', distance: '4.2 km', cuisines: ['Japanese', 'Sushi', 'Asian'], offer: '10% OFF', services: ['delivery', 'dine-in', 'table-booking'], isOpen: true, costForTwo: '₹900' },
  { id: 'rest-6', name: 'The Grand Biryani House', rating: 4.7, deliveryTime: '35 min', distance: '2.8 km', cuisines: ['Biryani', 'Mughlai', 'North Indian'], offer: 'FREE Delivery', isPromoted: true, services: ['delivery', 'takeaway', 'dine-in', 'table-booking'], isOpen: true, costForTwo: '₹700' },
  { id: 'rest-7', name: 'Arabia Bites', rating: 4.4, deliveryTime: '28 min', distance: '1.9 km', cuisines: ['Arabic', 'Mandi', 'Shawarma'], offer: '15% OFF', services: ['delivery', 'takeaway', 'dine-in', 'table-booking'], isOpen: true, costForTwo: '₹500' },
  { id: 'rest-8', name: 'Pizza Palace', rating: 4.6, deliveryTime: '30 min', distance: '2.5 km', cuisines: ['Pizza', 'Italian', 'Pasta'], services: ['delivery', 'takeaway', 'dine-in', 'table-booking'], isOpen: true, costForTwo: '₹600' },
];

export const MOCK_MENU = {
  'default': [
    {
      category: 'Starters',
      items: [
        { id: 'item-101', name: 'Chicken 65', price: 240, description: 'Crispy deep-fried chicken marinated in spicy red chili batter.', type: 'non-veg', bestseller: true },
        { id: 'item-102', name: 'Paneer Tikka', price: 220, description: 'Grilled paneer cubes with bell peppers and onion in tandoor.', type: 'veg', bestseller: false },
        { id: 'item-103', name: 'Veg Spring Rolls', price: 180, description: 'Crispy rolls filled with fresh vegetables and served with sweet chili sauce.', type: 'veg', bestseller: false },
        { id: 'item-104', name: 'Mutton Seekh Kebab', price: 350, description: 'Minced mutton with authentic spices cooked on a skewer.', type: 'non-veg', bestseller: true },
      ]
    },
    {
      category: 'Soups',
      items: [
        { id: 'item-201', name: 'Sweet Corn Chicken Soup', price: 160, description: 'Comforting Chinese soup with sweet corn and shredded chicken.', type: 'non-veg', bestseller: false },
        { id: 'item-202', name: 'Tomato Basil Soup', price: 140, description: 'Creamy tomato soup flavored with fresh basil leaves.', type: 'veg', bestseller: true },
        { id: 'item-203', name: 'Hot and Sour Veg Soup', price: 150, description: 'Spicy and tangy Chinese style vegetable soup.', type: 'veg', bestseller: false }
      ]
    },
    {
      category: 'Salads',
      items: [
        { id: 'item-301', name: 'Caesar Salad', price: 220, description: 'Fresh lettuce, croutons, parmesan cheese, and Caesar dressing.', type: 'veg', bestseller: false },
        { id: 'item-302', name: 'Greek Salad', price: 250, description: 'Cucumbers, tomatoes, olives, red onions, and feta cheese.', type: 'veg', bestseller: true },
        { id: 'item-303', name: 'Chicken Tikka Salad', price: 280, description: 'Tandoori chicken cubes with mixed greens and mint dressing.', type: 'non-veg', bestseller: false }
      ]
    },
    {
      category: 'Main Course',
      items: [
        { id: 'item-401', name: 'Butter Chicken', price: 380, description: 'Tender chicken pieces in a rich, creamy tomato gravy.', type: 'non-veg', bestseller: true },
        { id: 'item-402', name: 'Paneer Butter Masala', price: 320, description: 'Cottage cheese in a creamy tomato and cashew nut gravy.', type: 'veg', bestseller: true },
        { id: 'item-403', name: 'Mutton Rogan Josh', price: 450, description: 'Classic Kashmiri style slow-cooked mutton curry.', type: 'non-veg', bestseller: false }
      ]
    },
    {
      category: 'Biryani',
      items: [
        { id: 'item-501', name: 'Chicken Dum Biryani', price: 350, description: 'Signature Hyderabadi biryani cooked with fragrant basmati rice.', type: 'non-veg', bestseller: true },
        { id: 'item-502', name: 'Mutton Biryani', price: 450, description: 'Slow-cooked mutton layered with aromatic basmati rice.', type: 'non-veg', bestseller: true },
        { id: 'item-503', name: 'Veg Dum Biryani', price: 280, description: 'Assorted vegetables cooked with basmati rice and Indian spices.', type: 'veg', bestseller: false }
      ]
    },
    {
      category: 'Rice Items',
      items: [
        { id: 'item-601', name: 'Jeera Rice', price: 150, description: 'Basmati rice tossed with cumin seeds and fresh coriander.', type: 'veg', bestseller: true },
        { id: 'item-602', name: 'Veg Fried Rice', price: 220, description: 'Wok-tossed rice with mixed vegetables and soy sauce.', type: 'veg', bestseller: false },
        { id: 'item-603', name: 'Chicken Fried Rice', price: 260, description: 'Wok-tossed rice with egg, chicken pieces, and vegetables.', type: 'non-veg', bestseller: true }
      ]
    },
    {
      category: 'Noodles',
      items: [
        { id: 'item-701', name: 'Veg Hakka Noodles', price: 220, description: 'Classic Indo-Chinese style noodles tossed with veggies.', type: 'veg', bestseller: true },
        { id: 'item-702', name: 'Chicken Chilli Garlic Noodles', price: 260, description: 'Spicy noodles with garlic, chili flakes, and chicken chunks.', type: 'non-veg', bestseller: false }
      ]
    },
    {
      category: 'Indian Food',
      items: [
        { id: 'item-801', name: 'Dal Makhani', price: 240, description: 'Black lentils slow-cooked overnight with butter and cream.', type: 'veg', bestseller: true },
        { id: 'item-802', name: 'Garlic Naan', price: 65, description: 'Tandoor baked flatbread topped with chopped garlic.', type: 'veg', bestseller: true },
        { id: 'item-803', name: 'Tandoori Roti', price: 30, description: 'Whole wheat flatbread baked in traditional tandoor.', type: 'veg', bestseller: false }
      ]
    },
    {
      category: 'Arabic Food',
      items: [
        { id: 'item-901', name: 'Chicken Mandi', price: 450, description: 'Traditional Yemeni dish with fragrant rice and slow-cooked chicken.', type: 'non-veg', bestseller: true },
        { id: 'item-902', name: 'Hummus with Pita', price: 220, description: 'Creamy chickpea dip served with freshly baked pita bread.', type: 'veg', bestseller: false },
        { id: 'item-903', name: 'Chicken Shawarma Platter', price: 350, description: 'Slices of roasted chicken served with fries, pickles, and garlic sauce.', type: 'non-veg', bestseller: true }
      ]
    },
    {
      category: 'Chinese Food',
      items: [
        { id: 'item-1001', name: 'Chilli Chicken Dry', price: 280, description: 'Crispy chicken cubes tossed with bell peppers and green chilies.', type: 'non-veg', bestseller: true },
        { id: 'item-1002', name: 'Gobi Manchurian', price: 220, description: 'Deep-fried cauliflower florets in a spicy, tangy sauce.', type: 'veg', bestseller: false }
      ]
    },
    {
      category: 'Grills',
      items: [
        { id: 'item-1101', name: 'Tandoori Chicken (Half)', price: 320, description: 'Classic tandoori chicken marinated in yogurt and spices.', type: 'non-veg', bestseller: true },
        { id: 'item-1102', name: 'Grilled Fish Tikka', price: 420, description: 'Boneless fish cubes marinated and grilled to perfection.', type: 'non-veg', bestseller: false }
      ]
    },
    {
      category: 'Burgers',
      items: [
        { id: 'item-1201', name: 'Classic Chicken Burger', price: 250, description: 'Crispy chicken patty with lettuce, tomato, and mayo.', type: 'non-veg', bestseller: true },
        { id: 'item-1202', name: 'Veggie Supreme Burger', price: 200, description: 'Mixed vegetable patty with cheese and tangy sauce.', type: 'veg', bestseller: false }
      ]
    },
    {
      category: 'Sandwiches',
      items: [
        { id: 'item-1301', name: 'Club Sandwich (Non-Veg)', price: 280, description: 'Triple-decker sandwich with chicken, egg, cheese, and veggies.', type: 'non-veg', bestseller: true },
        { id: 'item-1302', name: 'Bombay Grilled Sandwich', price: 180, description: 'Spicy potato filling, cheese, and green chutney.', type: 'veg', bestseller: false }
      ]
    },
    {
      category: 'Pizza',
      items: [
        { id: 'item-1401', name: 'Margherita Pizza', price: 350, description: 'Classic pizza with tomato sauce, fresh mozzarella, and basil.', type: 'veg', bestseller: true },
        { id: 'item-1402', name: 'Chicken Pepperoni Pizza', price: 450, description: 'Loaded with chicken pepperoni and extra cheese.', type: 'non-veg', bestseller: true }
      ]
    },
    {
      category: 'Pasta',
      items: [
        { id: 'item-1501', name: 'Penne Alfredo', price: 320, description: 'Penne pasta in a rich and creamy white sauce with mushrooms.', type: 'veg', bestseller: true },
        { id: 'item-1502', name: 'Spaghetti Bolognese', price: 380, description: 'Spaghetti with slow-cooked minced meat sauce.', type: 'non-veg', bestseller: false }
      ]
    },
    {
      category: 'Juices',
      items: [
        { id: 'item-1601', name: 'Fresh Watermelon Juice', price: 120, description: '100% fresh watermelon juice, no added sugar.', type: 'veg', bestseller: true },
        { id: 'item-1602', name: 'Orange Juice', price: 140, description: 'Freshly squeezed sweet orange juice.', type: 'veg', bestseller: false }
      ]
    },
    {
      category: 'Tea and Coffee',
      items: [
        { id: 'item-1701', name: 'Masala Chai', price: 60, description: 'Strong Indian tea brewed with ginger, cardamom, and milk.', type: 'veg', bestseller: true },
        { id: 'item-1702', name: 'Cappuccino', price: 150, description: 'Espresso topped with steamed milk and a thick layer of foam.', type: 'veg', bestseller: false }
      ]
    },
    {
      category: 'Desserts',
      items: [
        { id: 'item-1801', name: 'Sizzling Brownie with Ice Cream', price: 220, description: 'Warm chocolate brownie topped with vanilla ice cream and hot fudge.', type: 'veg', bestseller: true },
        { id: 'item-1802', name: 'Gulab Jamun (2 pcs)', price: 90, description: 'Soft milk solids dumplings in cardamom sugar syrup.', type: 'veg', bestseller: false }
      ]
    },
    {
      category: 'Kids Meals',
      items: [
        { id: 'item-1901', name: 'Kids Chicken Nuggets Meal', price: 250, description: '6 pcs chicken nuggets, small fries, and a juice box.', type: 'non-veg', bestseller: true },
        { id: 'item-1902', name: 'Kids Mini Cheese Pizza', price: 200, description: '6-inch classic cheese pizza with a juice box.', type: 'veg', bestseller: false }
      ]
    },
    {
      category: 'Combos',
      items: [
        { id: 'item-2001', name: 'Executive Veg Thali', price: 350, description: 'Paneer dish, dal, dry veg, rice, 2 rotis, sweet, and papad.', type: 'veg', bestseller: true },
        { id: 'item-2002', name: 'Chicken Biryani Combo', price: 420, description: 'Chicken dum biryani with chicken 65 (starter) and cold drink.', type: 'non-veg', bestseller: true }
      ]
    }
  ]
};
