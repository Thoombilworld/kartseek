/**
 * India PIN Code Location Database
 *
 * Comprehensive hierarchy covering all 28 States + 8 Union Territories of India.
 * Provides O(1) PIN code → {state, district, city, zone} lookups.
 *
 * PIN Code Structure (India Post):
 *  - First digit: Postal Zone (1-9)
 *  - Second digit: Sub-Zone
 *  - Third digit: Sorting District
 *  - Last 3 digits: Delivery Post Office
 */

export interface IndiaState {
  code: string;       // 2-letter ISO 3166-2:IN state code
  name: string;
  capital: string;
  zone: string;       // Postal Zone
  isUT: boolean;      // Union Territory
  districts: IndiaDistrict[];
}

export interface IndiaDistrict {
  name: string;
  pinRangeStart: number;
  pinRangeEnd: number;
  majorCities: string[];
  tier: 1 | 2 | 3;   // City tier for delivery SLA calculation
}

export interface PinCodeResult {
  pinCode: string;
  stateName: string;
  stateCode: string;
  district: string;
  city: string;
  zone: string;
  tier: 1 | 2 | 3;
  isUT: boolean;
  deliverable: boolean;
  estimatedDeliveryDays: { standard: number; express: number };
}

// ─── All 28 States + 8 Union Territories ──────────────────────────────────────

export const INDIA_STATES: IndiaState[] = [
  // ── Zone 1 — Delhi & Haryana ────────────────────────────────────────────────
  {
    code: 'DL', name: 'Delhi', capital: 'New Delhi', zone: '1', isUT: true,
    districts: [
      { name: 'New Delhi', pinRangeStart: 110001, pinRangeEnd: 110009, majorCities: ['Connaught Place', 'Rajpath', 'Chanakyapuri'], tier: 1 },
      { name: 'Central Delhi', pinRangeStart: 110001, pinRangeEnd: 110029, majorCities: ['Paharganj', 'Karol Bagh', 'Daryaganj'], tier: 1 },
      { name: 'North Delhi', pinRangeStart: 110006, pinRangeEnd: 110054, majorCities: ['Civil Lines', 'Model Town', 'Rohini'], tier: 1 },
      { name: 'South Delhi', pinRangeStart: 110013, pinRangeEnd: 110076, majorCities: ['Saket', 'Hauz Khas', 'Greater Kailash', 'Vasant Kunj'], tier: 1 },
      { name: 'East Delhi', pinRangeStart: 110031, pinRangeEnd: 110096, majorCities: ['Preet Vihar', 'Laxmi Nagar', 'Patparganj'], tier: 1 },
      { name: 'West Delhi', pinRangeStart: 110015, pinRangeEnd: 110087, majorCities: ['Punjabi Bagh', 'Rajouri Garden', 'Dwarka'], tier: 1 },
    ],
  },
  {
    code: 'HR', name: 'Haryana', capital: 'Chandigarh', zone: '1', isUT: false,
    districts: [
      { name: 'Gurgaon', pinRangeStart: 122001, pinRangeEnd: 122108, majorCities: ['Gurugram', 'Manesar', 'Sohna'], tier: 1 },
      { name: 'Faridabad', pinRangeStart: 121001, pinRangeEnd: 121106, majorCities: ['Faridabad', 'Ballabhgarh'], tier: 1 },
      { name: 'Ambala', pinRangeStart: 134001, pinRangeEnd: 135133, majorCities: ['Ambala', 'Ambala Cantt'], tier: 2 },
      { name: 'Rohtak', pinRangeStart: 124001, pinRangeEnd: 124513, majorCities: ['Rohtak', 'Bahadurgarh'], tier: 2 },
      { name: 'Panipat', pinRangeStart: 132001, pinRangeEnd: 132157, majorCities: ['Panipat', 'Samalkha'], tier: 2 },
      { name: 'Karnal', pinRangeStart: 132001, pinRangeEnd: 132117, majorCities: ['Karnal', 'Kaithal'], tier: 2 },
      { name: 'Hisar', pinRangeStart: 125001, pinRangeEnd: 125113, majorCities: ['Hisar', 'Fatehabad'], tier: 2 },
      { name: 'Sonipat', pinRangeStart: 131001, pinRangeEnd: 131402, majorCities: ['Sonipat', 'Kundli'], tier: 2 },
    ],
  },
  // ── Zone 1 — Punjab & HP ────────────────────────────────────────────────────
  {
    code: 'PB', name: 'Punjab', capital: 'Chandigarh', zone: '1', isUT: false,
    districts: [
      { name: 'Ludhiana', pinRangeStart: 141001, pinRangeEnd: 141421, majorCities: ['Ludhiana', 'Khanna'], tier: 1 },
      { name: 'Amritsar', pinRangeStart: 143001, pinRangeEnd: 143533, majorCities: ['Amritsar', 'Tarn Taran'], tier: 1 },
      { name: 'Jalandhar', pinRangeStart: 144001, pinRangeEnd: 144628, majorCities: ['Jalandhar', 'Kapurthala'], tier: 1 },
      { name: 'Patiala', pinRangeStart: 147001, pinRangeEnd: 147202, majorCities: ['Patiala', 'Rajpura'], tier: 2 },
      { name: 'Mohali', pinRangeStart: 140301, pinRangeEnd: 140417, majorCities: ['Mohali', 'Kharar', 'Zirakpur'], tier: 1 },
    ],
  },
  {
    code: 'CH', name: 'Chandigarh', capital: 'Chandigarh', zone: '1', isUT: true,
    districts: [
      { name: 'Chandigarh', pinRangeStart: 160001, pinRangeEnd: 160036, majorCities: ['Sector 17', 'Sector 22', 'Industrial Area'], tier: 1 },
    ],
  },
  {
    code: 'HP', name: 'Himachal Pradesh', capital: 'Shimla', zone: '1', isUT: false,
    districts: [
      { name: 'Shimla', pinRangeStart: 171001, pinRangeEnd: 171301, majorCities: ['Shimla', 'Rampur'], tier: 2 },
      { name: 'Kangra', pinRangeStart: 176001, pinRangeEnd: 176325, majorCities: ['Dharamsala', 'Palampur', 'Mcleod Ganj'], tier: 2 },
      { name: 'Kullu', pinRangeStart: 175001, pinRangeEnd: 175138, majorCities: ['Kullu', 'Manali'], tier: 3 },
    ],
  },
  // ── Zone 2 — UP & Uttarakhand ───────────────────────────────────────────────
  {
    code: 'UP', name: 'Uttar Pradesh', capital: 'Lucknow', zone: '2', isUT: false,
    districts: [
      { name: 'Lucknow', pinRangeStart: 226001, pinRangeEnd: 226030, majorCities: ['Lucknow', 'Gomti Nagar', 'Aliganj'], tier: 1 },
      { name: 'Agra', pinRangeStart: 282001, pinRangeEnd: 283202, majorCities: ['Agra', 'Firozabad', 'Mathura'], tier: 1 },
      { name: 'Kanpur', pinRangeStart: 208001, pinRangeEnd: 209801, majorCities: ['Kanpur', 'Unnao'], tier: 1 },
      { name: 'Varanasi', pinRangeStart: 221001, pinRangeEnd: 221313, majorCities: ['Varanasi', 'Sarnath'], tier: 1 },
      { name: 'Prayagraj', pinRangeStart: 211001, pinRangeEnd: 212307, majorCities: ['Prayagraj', 'Naini'], tier: 1 },
      { name: 'Noida', pinRangeStart: 201301, pinRangeEnd: 201309, majorCities: ['Noida', 'Greater Noida', 'Sector 18'], tier: 1 },
      { name: 'Ghaziabad', pinRangeStart: 201001, pinRangeEnd: 201206, majorCities: ['Ghaziabad', 'Indirapuram', 'Raj Nagar'], tier: 1 },
      { name: 'Mathura', pinRangeStart: 281001, pinRangeEnd: 281404, majorCities: ['Mathura', 'Vrindavan'], tier: 2 },
      { name: 'Meerut', pinRangeStart: 250001, pinRangeEnd: 250617, majorCities: ['Meerut', 'Hapur'], tier: 2 },
      { name: 'Bareilly', pinRangeStart: 243001, pinRangeEnd: 243634, majorCities: ['Bareilly', 'Rampur'], tier: 2 },
      { name: 'Gorakhpur', pinRangeStart: 273001, pinRangeEnd: 273413, majorCities: ['Gorakhpur', 'Deoria'], tier: 2 },
    ],
  },
  {
    code: 'UK', name: 'Uttarakhand', capital: 'Dehradun', zone: '2', isUT: false,
    districts: [
      { name: 'Dehradun', pinRangeStart: 248001, pinRangeEnd: 248197, majorCities: ['Dehradun', 'Mussoorie', 'Rishikesh'], tier: 1 },
      { name: 'Haridwar', pinRangeStart: 249401, pinRangeEnd: 249411, majorCities: ['Haridwar', 'Roorkee'], tier: 2 },
      { name: 'Nainital', pinRangeStart: 263001, pinRangeEnd: 263641, majorCities: ['Nainital', 'Haldwani', 'Ramnagar'], tier: 2 },
    ],
  },
  // ── Zone 3 — Rajasthan ──────────────────────────────────────────────────────
  {
    code: 'RJ', name: 'Rajasthan', capital: 'Jaipur', zone: '3', isUT: false,
    districts: [
      { name: 'Jaipur', pinRangeStart: 302001, pinRangeEnd: 303912, majorCities: ['Jaipur', 'Mansarovar', 'Vaishali Nagar'], tier: 1 },
      { name: 'Jodhpur', pinRangeStart: 342001, pinRangeEnd: 342901, majorCities: ['Jodhpur', 'Pali'], tier: 1 },
      { name: 'Kota', pinRangeStart: 324001, pinRangeEnd: 326520, majorCities: ['Kota', 'Bundi'], tier: 2 },
      { name: 'Udaipur', pinRangeStart: 313001, pinRangeEnd: 313901, majorCities: ['Udaipur', 'Rajsamand'], tier: 2 },
      { name: 'Ajmer', pinRangeStart: 305001, pinRangeEnd: 305817, majorCities: ['Ajmer', 'Pushkar'], tier: 2 },
      { name: 'Bikaner', pinRangeStart: 334001, pinRangeEnd: 334803, majorCities: ['Bikaner'], tier: 2 },
    ],
  },
  {
    code: 'GJ', name: 'Gujarat', capital: 'Gandhinagar', zone: '3', isUT: false,
    districts: [
      { name: 'Ahmedabad', pinRangeStart: 380001, pinRangeEnd: 382481, majorCities: ['Ahmedabad', 'Bopal', 'Maninagar', 'SG Highway'], tier: 1 },
      { name: 'Surat', pinRangeStart: 394101, pinRangeEnd: 395023, majorCities: ['Surat', 'Vesu', 'Adajan'], tier: 1 },
      { name: 'Vadodara', pinRangeStart: 390001, pinRangeEnd: 391775, majorCities: ['Vadodara', 'Alkapuri'], tier: 1 },
      { name: 'Rajkot', pinRangeStart: 360001, pinRangeEnd: 363642, majorCities: ['Rajkot', 'Gondal'], tier: 2 },
      { name: 'Gandhinagar', pinRangeStart: 382001, pinRangeEnd: 382650, majorCities: ['Gandhinagar', 'Infocity'], tier: 1 },
      { name: 'Bhavnagar', pinRangeStart: 364001, pinRangeEnd: 364750, majorCities: ['Bhavnagar', 'Sihor'], tier: 2 },
    ],
  },
  // ── Zone 4 — Maharashtra & Goa ──────────────────────────────────────────────
  {
    code: 'MH', name: 'Maharashtra', capital: 'Mumbai', zone: '4', isUT: false,
    districts: [
      { name: 'Mumbai', pinRangeStart: 400001, pinRangeEnd: 400104, majorCities: ['Mumbai GPO', 'Colaba', 'Fort', 'Bandra', 'Andheri', 'Powai', 'Borivali'], tier: 1 },
      { name: 'Mumbai Suburban', pinRangeStart: 400050, pinRangeEnd: 401209, majorCities: ['Kurla', 'Dharavi', 'Malad', 'Kandivali', 'Dahisar'], tier: 1 },
      { name: 'Thane', pinRangeStart: 400601, pinRangeEnd: 421605, majorCities: ['Thane', 'Navi Mumbai', 'Kalyan', 'Dombivli', 'Ulhasnagar'], tier: 1 },
      { name: 'Pune', pinRangeStart: 411001, pinRangeEnd: 413802, majorCities: ['Pune', 'Hinjewadi', 'Kothrud', 'Viman Nagar', 'Aundh', 'Wakad'], tier: 1 },
      { name: 'Nashik', pinRangeStart: 422001, pinRangeEnd: 423401, majorCities: ['Nashik', 'Malegaon'], tier: 2 },
      { name: 'Nagpur', pinRangeStart: 440001, pinRangeEnd: 441614, majorCities: ['Nagpur', 'Wardha'], tier: 1 },
      { name: 'Aurangabad', pinRangeStart: 431001, pinRangeEnd: 431807, majorCities: ['Aurangabad', 'Jalna'], tier: 2 },
      { name: 'Kolhapur', pinRangeStart: 416001, pinRangeEnd: 416813, majorCities: ['Kolhapur', 'Sangli'], tier: 2 },
    ],
  },
  {
    code: 'GA', name: 'Goa', capital: 'Panaji', zone: '4', isUT: false,
    districts: [
      { name: 'North Goa', pinRangeStart: 403001, pinRangeEnd: 403521, majorCities: ['Panaji', 'Mapusa', 'Calangute', 'Anjuna'], tier: 2 },
      { name: 'South Goa', pinRangeStart: 403601, pinRangeEnd: 403804, majorCities: ['Margao', 'Vasco da Gama', 'Colva'], tier: 2 },
    ],
  },
  // ── Zone 5 — Karnataka & AP & Telangana ────────────────────────────────────
  {
    code: 'KA', name: 'Karnataka', capital: 'Bengaluru', zone: '5', isUT: false,
    districts: [
      { name: 'Bengaluru Urban', pinRangeStart: 560001, pinRangeEnd: 562162, majorCities: ['Bengaluru', 'Whitefield', 'Electronic City', 'Koramangala', 'HSR Layout', 'Indiranagar', 'Jayanagar'], tier: 1 },
      { name: 'Bengaluru Rural', pinRangeStart: 561201, pinRangeEnd: 562135, majorCities: ['Devanahalli', 'Nelamangala', 'Anekal'], tier: 2 },
      { name: 'Mysuru', pinRangeStart: 570001, pinRangeEnd: 571896, majorCities: ['Mysuru', 'Nanjangud'], tier: 1 },
      { name: 'Mangaluru', pinRangeStart: 575001, pinRangeEnd: 576283, majorCities: ['Mangaluru', 'Udupi'], tier: 1 },
      { name: 'Hubballi', pinRangeStart: 580001, pinRangeEnd: 581400, majorCities: ['Hubballi', 'Dharwad'], tier: 2 },
      { name: 'Belagavi', pinRangeStart: 590001, pinRangeEnd: 591346, majorCities: ['Belagavi', 'Gokak'], tier: 2 },
      { name: 'Shivamogga', pinRangeStart: 577001, pinRangeEnd: 577556, majorCities: ['Shivamogga', 'Bhadravati'], tier: 2 },
    ],
  },
  {
    code: 'AP', name: 'Andhra Pradesh', capital: 'Amaravati', zone: '5', isUT: false,
    districts: [
      { name: 'Visakhapatnam', pinRangeStart: 530001, pinRangeEnd: 531173, majorCities: ['Visakhapatnam', 'Gajuwaka', 'Bheemunipatnam'], tier: 1 },
      { name: 'Vijayawada', pinRangeStart: 520001, pinRangeEnd: 521456, majorCities: ['Vijayawada', 'Gudivada'], tier: 1 },
      { name: 'Guntur', pinRangeStart: 522001, pinRangeEnd: 522649, majorCities: ['Guntur', 'Tenali'], tier: 2 },
      { name: 'Tirupati', pinRangeStart: 517501, pinRangeEnd: 517619, majorCities: ['Tirupati', 'Tirumala'], tier: 2 },
    ],
  },
  {
    code: 'TG', name: 'Telangana', capital: 'Hyderabad', zone: '5', isUT: false,
    districts: [
      { name: 'Hyderabad', pinRangeStart: 500001, pinRangeEnd: 500097, majorCities: ['Hyderabad', 'Secunderabad', 'Banjara Hills', 'Jubilee Hills', 'Gachibowli', 'HITEC City'], tier: 1 },
      { name: 'Rangareddy', pinRangeStart: 500030, pinRangeEnd: 501512, majorCities: ['Cyberabad', 'Shamshabad', 'Maheshwaram'], tier: 1 },
      { name: 'Medchal', pinRangeStart: 500078, pinRangeEnd: 501401, majorCities: ['Kompally', 'Alwal', 'Pocharam'], tier: 2 },
      { name: 'Warangal', pinRangeStart: 506001, pinRangeEnd: 506381, majorCities: ['Warangal', 'Hanamkonda'], tier: 2 },
    ],
  },
  // ── Zone 6 — Tamil Nadu & Kerala & Puducherry ───────────────────────────────
  {
    code: 'TN', name: 'Tamil Nadu', capital: 'Chennai', zone: '6', isUT: false,
    districts: [
      { name: 'Chennai', pinRangeStart: 600001, pinRangeEnd: 600129, majorCities: ['Chennai', 'T. Nagar', 'Anna Nagar', 'Velachery', 'OMR', 'Adyar'], tier: 1 },
      { name: 'Coimbatore', pinRangeStart: 641001, pinRangeEnd: 642154, majorCities: ['Coimbatore', 'Tiruppur'], tier: 1 },
      { name: 'Madurai', pinRangeStart: 625001, pinRangeEnd: 625706, majorCities: ['Madurai', 'Dindigul'], tier: 1 },
      { name: 'Tiruchirappalli', pinRangeStart: 620001, pinRangeEnd: 621313, majorCities: ['Trichy', 'Srirangam'], tier: 1 },
      { name: 'Salem', pinRangeStart: 636001, pinRangeEnd: 636453, majorCities: ['Salem', 'Erode'], tier: 2 },
      { name: 'Tirunelveli', pinRangeStart: 627001, pinRangeEnd: 627951, majorCities: ['Tirunelveli', 'Nagercoil'], tier: 2 },
      { name: 'Vellore', pinRangeStart: 632001, pinRangeEnd: 635853, majorCities: ['Vellore', 'Katpadi'], tier: 2 },
    ],
  },
  {
    code: 'KL', name: 'Kerala', capital: 'Thiruvananthapuram', zone: '6', isUT: false,
    districts: [
      { name: 'Thiruvananthapuram', pinRangeStart: 695001, pinRangeEnd: 695615, majorCities: ['Thiruvananthapuram', 'Kowdiar', 'Kazhakkoottam'], tier: 1 },
      { name: 'Ernakulam', pinRangeStart: 682001, pinRangeEnd: 683575, majorCities: ['Kochi', 'Edapally', 'Kakkanad', 'Aluva'], tier: 1 },
      { name: 'Kozhikode', pinRangeStart: 673001, pinRangeEnd: 673651, majorCities: ['Kozhikode', 'Calicut'], tier: 1 },
      { name: 'Thrissur', pinRangeStart: 680001, pinRangeEnd: 680751, majorCities: ['Thrissur', 'Guruvayur'], tier: 2 },
      { name: 'Malappuram', pinRangeStart: 676101, pinRangeEnd: 679591, majorCities: ['Malappuram', 'Manjeri'], tier: 2 },
      { name: 'Kannur', pinRangeStart: 670001, pinRangeEnd: 670691, majorCities: ['Kannur', 'Thalassery'], tier: 2 },
    ],
  },
  {
    code: 'PY', name: 'Puducherry', capital: 'Puducherry', zone: '6', isUT: true,
    districts: [
      { name: 'Puducherry', pinRangeStart: 605001, pinRangeEnd: 605112, majorCities: ['Puducherry', 'Auroville'], tier: 2 },
    ],
  },
  // ── Zone 7 — West Bengal & NE States ───────────────────────────────────────
  {
    code: 'WB', name: 'West Bengal', capital: 'Kolkata', zone: '7', isUT: false,
    districts: [
      { name: 'Kolkata', pinRangeStart: 700001, pinRangeEnd: 700157, majorCities: ['Kolkata', 'Park Street', 'Salt Lake', 'New Town', 'Howrah'], tier: 1 },
      { name: 'North 24 Parganas', pinRangeStart: 700101, pinRangeEnd: 743513, majorCities: ['Barasat', 'Bally', 'Dum Dum'], tier: 2 },
      { name: 'Howrah', pinRangeStart: 711101, pinRangeEnd: 711410, majorCities: ['Howrah', 'Uluberia', 'Shibpur'], tier: 1 },
      { name: 'Darjeeling', pinRangeStart: 734001, pinRangeEnd: 734428, majorCities: ['Darjeeling', 'Siliguri', 'Kurseong'], tier: 2 },
      { name: 'Bardhaman', pinRangeStart: 713101, pinRangeEnd: 713426, majorCities: ['Bardhaman', 'Durgapur', 'Asansol'], tier: 2 },
    ],
  },
  {
    code: 'AS', name: 'Assam', capital: 'Dispur', zone: '7', isUT: false,
    districts: [
      { name: 'Kamrup (Metro)', pinRangeStart: 781001, pinRangeEnd: 781380, majorCities: ['Guwahati', 'Dispur', 'Jalukbari'], tier: 1 },
      { name: 'Dibrugarh', pinRangeStart: 786001, pinRangeEnd: 786622, majorCities: ['Dibrugarh', 'Tinsukia'], tier: 2 },
      { name: 'Jorhat', pinRangeStart: 785001, pinRangeEnd: 785640, majorCities: ['Jorhat', 'Titabar'], tier: 2 },
    ],
  },
  {
    code: 'SK', name: 'Sikkim', capital: 'Gangtok', zone: '7', isUT: false,
    districts: [
      { name: 'East Sikkim', pinRangeStart: 737101, pinRangeEnd: 737135, majorCities: ['Gangtok', 'Ranipool'], tier: 3 },
    ],
  },
  {
    code: 'MN', name: 'Manipur', capital: 'Imphal', zone: '7', isUT: false,
    districts: [
      { name: 'Imphal West', pinRangeStart: 795001, pinRangeEnd: 795002, majorCities: ['Imphal'], tier: 3 },
    ],
  },
  {
    code: 'ML', name: 'Meghalaya', capital: 'Shillong', zone: '7', isUT: false,
    districts: [
      { name: 'East Khasi Hills', pinRangeStart: 793001, pinRangeEnd: 793200, majorCities: ['Shillong', 'Mawlai'], tier: 3 },
    ],
  },
  {
    code: 'TR', name: 'Tripura', capital: 'Agartala', zone: '7', isUT: false,
    districts: [
      { name: 'West Tripura', pinRangeStart: 799001, pinRangeEnd: 799290, majorCities: ['Agartala', 'Badharghat'], tier: 3 },
    ],
  },
  {
    code: 'NL', name: 'Nagaland', capital: 'Kohima', zone: '7', isUT: false,
    districts: [
      { name: 'Kohima', pinRangeStart: 797001, pinRangeEnd: 797115, majorCities: ['Kohima', 'Dimapur'], tier: 3 },
    ],
  },
  {
    code: 'MZ', name: 'Mizoram', capital: 'Aizawl', zone: '7', isUT: false,
    districts: [
      { name: 'Aizawl', pinRangeStart: 796001, pinRangeEnd: 796901, majorCities: ['Aizawl'], tier: 3 },
    ],
  },
  {
    code: 'AR', name: 'Arunachal Pradesh', capital: 'Itanagar', zone: '7', isUT: false,
    districts: [
      { name: 'Papum Pare', pinRangeStart: 791111, pinRangeEnd: 791123, majorCities: ['Itanagar', 'Naharlagun'], tier: 3 },
    ],
  },
  // ── Zone 8 — Bihar & Jharkhand & Odisha ────────────────────────────────────
  {
    code: 'BR', name: 'Bihar', capital: 'Patna', zone: '8', isUT: false,
    districts: [
      { name: 'Patna', pinRangeStart: 800001, pinRangeEnd: 801506, majorCities: ['Patna', 'Danapur', 'Phulwari', 'Kankarbagh'], tier: 1 },
      { name: 'Gaya', pinRangeStart: 823001, pinRangeEnd: 824304, majorCities: ['Gaya', 'Bodh Gaya'], tier: 2 },
      { name: 'Bhagalpur', pinRangeStart: 812001, pinRangeEnd: 813211, majorCities: ['Bhagalpur', 'Banka'], tier: 2 },
      { name: 'Muzaffarpur', pinRangeStart: 842001, pinRangeEnd: 843302, majorCities: ['Muzaffarpur', 'Sitamarhi'], tier: 2 },
    ],
  },
  {
    code: 'JH', name: 'Jharkhand', capital: 'Ranchi', zone: '8', isUT: false,
    districts: [
      { name: 'Ranchi', pinRangeStart: 834001, pinRangeEnd: 835325, majorCities: ['Ranchi', 'Hatia', 'Namkum'], tier: 1 },
      { name: 'Dhanbad', pinRangeStart: 826001, pinRangeEnd: 828403, majorCities: ['Dhanbad', 'Jharia', 'Bokaro'], tier: 2 },
      { name: 'Jamshedpur', pinRangeStart: 831001, pinRangeEnd: 832114, majorCities: ['Jamshedpur', 'Adityapur'], tier: 1 },
    ],
  },
  {
    code: 'OD', name: 'Odisha', capital: 'Bhubaneswar', zone: '8', isUT: false,
    districts: [
      { name: 'Khordha', pinRangeStart: 751001, pinRangeEnd: 752120, majorCities: ['Bhubaneswar', 'Khordha'], tier: 1 },
      { name: 'Cuttack', pinRangeStart: 753001, pinRangeEnd: 754297, majorCities: ['Cuttack', 'Jagatsinghpur'], tier: 1 },
      { name: 'Puri', pinRangeStart: 752001, pinRangeEnd: 752121, majorCities: ['Puri', 'Konark'], tier: 2 },
    ],
  },
  {
    code: 'CG', name: 'Chhattisgarh', capital: 'Raipur', zone: '8', isUT: false,
    districts: [
      { name: 'Raipur', pinRangeStart: 492001, pinRangeEnd: 493898, majorCities: ['Raipur', 'Bhilai', 'Durg'], tier: 1 },
      { name: 'Bilaspur', pinRangeStart: 495001, pinRangeEnd: 495688, majorCities: ['Bilaspur', 'Raigarh'], tier: 2 },
    ],
  },
  // ── Zone 9 — MP ─────────────────────────────────────────────────────────────
  {
    code: 'MP', name: 'Madhya Pradesh', capital: 'Bhopal', zone: '9', isUT: false,
    districts: [
      { name: 'Bhopal', pinRangeStart: 462001, pinRangeEnd: 462047, majorCities: ['Bhopal', 'Misrod', 'Hoshangabad Road'], tier: 1 },
      { name: 'Indore', pinRangeStart: 452001, pinRangeEnd: 453771, majorCities: ['Indore', 'Dewas'], tier: 1 },
      { name: 'Jabalpur', pinRangeStart: 482001, pinRangeEnd: 483770, majorCities: ['Jabalpur', 'Mandla'], tier: 2 },
      { name: 'Gwalior', pinRangeStart: 474001, pinRangeEnd: 476355, majorCities: ['Gwalior', 'Morena'], tier: 2 },
      { name: 'Ujjain', pinRangeStart: 456001, pinRangeEnd: 456776, majorCities: ['Ujjain', 'Nagda'], tier: 2 },
    ],
  },
  // ── Union Territories ───────────────────────────────────────────────────────
  {
    code: 'JK', name: 'Jammu & Kashmir', capital: 'Srinagar', zone: '1', isUT: true,
    districts: [
      { name: 'Srinagar', pinRangeStart: 190001, pinRangeEnd: 190025, majorCities: ['Srinagar', 'Lal Chowk', 'Hazratbal'], tier: 2 },
      { name: 'Jammu', pinRangeStart: 180001, pinRangeEnd: 180020, majorCities: ['Jammu', 'Udhampur'], tier: 2 },
    ],
  },
  {
    code: 'LA', name: 'Ladakh', capital: 'Leh', zone: '1', isUT: true,
    districts: [
      { name: 'Leh', pinRangeStart: 194101, pinRangeEnd: 194404, majorCities: ['Leh', 'Kargil'], tier: 3 },
    ],
  },
  {
    code: 'AN', name: 'Andaman & Nicobar Islands', capital: 'Port Blair', zone: '7', isUT: true,
    districts: [
      { name: 'South Andaman', pinRangeStart: 744101, pinRangeEnd: 744211, majorCities: ['Port Blair', 'Aberdeen Bazaar'], tier: 3 },
    ],
  },
  {
    code: 'DN', name: 'Dadra & Nagar Haveli and Daman & Diu', capital: 'Daman', zone: '3', isUT: true,
    districts: [
      { name: 'Daman', pinRangeStart: 396210, pinRangeEnd: 396220, majorCities: ['Daman'], tier: 3 },
      { name: 'Dadra', pinRangeStart: 396191, pinRangeEnd: 396235, majorCities: ['Silvassa'], tier: 3 },
    ],
  },
  {
    code: 'LD', name: 'La?adweep', capital: 'Kavaratti', zone: '6', isUT: true,
    districts: [
      { name: 'La?adweep', pinRangeStart: 682551, pinRangeEnd: 682559, majorCities: ['Kavaratti', 'Agatti'], tier: 3 },
    ],
  },
];

// ─── Build fast O(1) lookup maps ────────────────────────────────────────────

/** Map of well-known PIN codes to their location details */
export const KNOWN_PIN_CODES: Record<string, { state: string; stateCode: string; district: string; city: string; tier: 1 | 2 | 3; isUT: boolean }> = {
  // Delhi
  '110001': { state: 'Delhi', stateCode: 'DL', district: 'New Delhi', city: 'Connaught Place', tier: 1, isUT: true },
  '110011': { state: 'Delhi', stateCode: 'DL', district: 'New Delhi', city: 'Lodi Road', tier: 1, isUT: true },
  '110020': { state: 'Delhi', stateCode: 'DL', district: 'South Delhi', city: 'Saket', tier: 1, isUT: true },
  '110025': { state: 'Delhi', stateCode: 'DL', district: 'South Delhi', city: 'Safdarjung', tier: 1, isUT: true },
  '110030': { state: 'Delhi', stateCode: 'DL', district: 'South Delhi', city: 'Vasant Kunj', tier: 1, isUT: true },
  '110045': { state: 'Delhi', stateCode: 'DL', district: 'South Delhi', city: 'Dwarka', tier: 1, isUT: true },
  '110048': { state: 'Delhi', stateCode: 'DL', district: 'South Delhi', city: 'Hauz Khas', tier: 1, isUT: true },
  '110092': { state: 'Delhi', stateCode: 'DL', district: 'East Delhi', city: 'Shakarpur', tier: 1, isUT: true },
  // Mumbai
  '400001': { state: 'Maharashtra', stateCode: 'MH', district: 'Mumbai', city: 'Mumbai GPO', tier: 1, isUT: false },
  '400005': { state: 'Maharashtra', stateCode: 'MH', district: 'Mumbai', city: 'Colaba', tier: 1, isUT: false },
  '400016': { state: 'Maharashtra', stateCode: 'MH', district: 'Mumbai', city: 'Mahim', tier: 1, isUT: false },
  '400050': { state: 'Maharashtra', stateCode: 'MH', district: 'Mumbai Suburban', city: 'Bandra West', tier: 1, isUT: false },
  '400053': { state: 'Maharashtra', stateCode: 'MH', district: 'Mumbai Suburban', city: 'Andheri East', tier: 1, isUT: false },
  '400059': { state: 'Maharashtra', stateCode: 'MH', district: 'Mumbai Suburban', city: 'Powai', tier: 1, isUT: false },
  '400076': { state: 'Maharashtra', stateCode: 'MH', district: 'Mumbai Suburban', city: 'Borivali', tier: 1, isUT: false },
  // Pune
  '411001': { state: 'Maharashtra', stateCode: 'MH', district: 'Pune', city: 'Pune City', tier: 1, isUT: false },
  '411006': { state: 'Maharashtra', stateCode: 'MH', district: 'Pune', city: 'Shivajinagar', tier: 1, isUT: false },
  '411021': { state: 'Maharashtra', stateCode: 'MH', district: 'Pune', city: 'Kothrud', tier: 1, isUT: false },
  '411045': { state: 'Maharashtra', stateCode: 'MH', district: 'Pune', city: 'Wakad', tier: 1, isUT: false },
  '411057': { state: 'Maharashtra', stateCode: 'MH', district: 'Pune', city: 'Hinjewadi', tier: 1, isUT: false },
  // Bengaluru
  '560001': { state: 'Karnataka', stateCode: 'KA', district: 'Bengaluru Urban', city: 'Bengaluru GPO', tier: 1, isUT: false },
  '560008': { state: 'Karnataka', stateCode: 'KA', district: 'Bengaluru Urban', city: 'Malleswaram', tier: 1, isUT: false },
  '560034': { state: 'Karnataka', stateCode: 'KA', district: 'Bengaluru Urban', city: 'Koramangala', tier: 1, isUT: false },
  '560041': { state: 'Karnataka', stateCode: 'KA', district: 'Bengaluru Urban', city: 'Whitefield', tier: 1, isUT: false },
  '560066': { state: 'Karnataka', stateCode: 'KA', district: 'Bengaluru Urban', city: 'HSR Layout', tier: 1, isUT: false },
  '560068': { state: 'Karnataka', stateCode: 'KA', district: 'Bengaluru Urban', city: 'Indiranagar', tier: 1, isUT: false },
  '560100': { state: 'Karnataka', stateCode: 'KA', district: 'Bengaluru Urban', city: 'Electronic City', tier: 1, isUT: false },
  // Hyderabad
  '500001': { state: 'Telangana', stateCode: 'TG', district: 'Hyderabad', city: 'Hyderabad GPO', tier: 1, isUT: false },
  '500008': { state: 'Telangana', stateCode: 'TG', district: 'Hyderabad', city: 'Banjara Hills', tier: 1, isUT: false },
  '500033': { state: 'Telangana', stateCode: 'TG', district: 'Hyderabad', city: 'Jubilee Hills', tier: 1, isUT: false },
  '500032': { state: 'Telangana', stateCode: 'TG', district: 'Hyderabad', city: 'Secunderabad', tier: 1, isUT: false },
  '500081': { state: 'Telangana', stateCode: 'TG', district: 'Hyderabad', city: 'Gachibowli', tier: 1, isUT: false },
  '500084': { state: 'Telangana', stateCode: 'TG', district: 'Hyderabad', city: 'HITEC City', tier: 1, isUT: false },
  // Chennai
  '600001': { state: 'Tamil Nadu', stateCode: 'TN', district: 'Chennai', city: 'Chennai GPO', tier: 1, isUT: false },
  '600006': { state: 'Tamil Nadu', stateCode: 'TN', district: 'Chennai', city: 'Egmore', tier: 1, isUT: false },
  '600017': { state: 'Tamil Nadu', stateCode: 'TN', district: 'Chennai', city: 'Anna Nagar', tier: 1, isUT: false },
  '600042': { state: 'Tamil Nadu', stateCode: 'TN', district: 'Chennai', city: 'Velachery', tier: 1, isUT: false },
  // Kolkata
  '700001': { state: 'West Bengal', stateCode: 'WB', district: 'Kolkata', city: 'Kolkata GPO', tier: 1, isUT: false },
  '700013': { state: 'West Bengal', stateCode: 'WB', district: 'Kolkata', city: 'Park Street', tier: 1, isUT: false },
  '700064': { state: 'West Bengal', stateCode: 'WB', district: 'Kolkata', city: 'Salt Lake', tier: 1, isUT: false },
  '700156': { state: 'West Bengal', stateCode: 'WB', district: 'Kolkata', city: 'New Town', tier: 1, isUT: false },
  // Ahmedabad
  '380001': { state: 'Gujarat', stateCode: 'GJ', district: 'Ahmedabad', city: 'Ahmedabad GPO', tier: 1, isUT: false },
  '380006': { state: 'Gujarat', stateCode: 'GJ', district: 'Ahmedabad', city: 'Ellis Bridge', tier: 1, isUT: false },
  '380058': { state: 'Gujarat', stateCode: 'GJ', district: 'Ahmedabad', city: 'Bopal', tier: 1, isUT: false },
  // Noida / Gurgaon
  '201301': { state: 'Uttar Pradesh', stateCode: 'UP', district: 'Noida', city: 'Noida Sector 18', tier: 1, isUT: false },
  '201304': { state: 'Uttar Pradesh', stateCode: 'UP', district: 'Noida', city: 'Noida Sector 62', tier: 1, isUT: false },
  '122001': { state: 'Haryana', stateCode: 'HR', district: 'Gurgaon', city: 'Gurugram', tier: 1, isUT: false },
  '122002': { state: 'Haryana', stateCode: 'HR', district: 'Gurgaon', city: 'DLF City', tier: 1, isUT: false },
  // Lucknow
  '226001': { state: 'Uttar Pradesh', stateCode: 'UP', district: 'Lucknow', city: 'Lucknow GPO', tier: 1, isUT: false },
  '226010': { state: 'Uttar Pradesh', stateCode: 'UP', district: 'Lucknow', city: 'Gomti Nagar', tier: 1, isUT: false },
  // Jaipur
  '302001': { state: 'Rajasthan', stateCode: 'RJ', district: 'Jaipur', city: 'Jaipur GPO', tier: 1, isUT: false },
  '302017': { state: 'Rajasthan', stateCode: 'RJ', district: 'Jaipur', city: 'Vaishali Nagar', tier: 1, isUT: false },
  // Chandigarh
  '160001': { state: 'Chandigarh', stateCode: 'CH', district: 'Chandigarh', city: 'Sector 17', tier: 1, isUT: true },
  // Kochi
  '682001': { state: 'Kerala', stateCode: 'KL', district: 'Ernakulam', city: 'Kochi', tier: 1, isUT: false },
  '682021': { state: 'Kerala', stateCode: 'KL', district: 'Ernakulam', city: 'Kakkanad', tier: 1, isUT: false },
  // Patna
  '800001': { state: 'Bihar', stateCode: 'BR', district: 'Patna', city: 'Patna GPO', tier: 1, isUT: false },
  // Bhopal
  '462001': { state: 'Madhya Pradesh', stateCode: 'MP', district: 'Bhopal', city: 'Bhopal GPO', tier: 1, isUT: false },
  // Indore
  '452001': { state: 'Madhya Pradesh', stateCode: 'MP', district: 'Indore', city: 'Indore GPO', tier: 1, isUT: false },
};

/** State lookup map: stateCode → state data */
export const STATE_MAP: Record<string, IndiaState> = Object.fromEntries(
  INDIA_STATES.map(s => [s.code, s])
);

/** Delivery serviceability config by tier */
export const TIER_DELIVERY_CONFIG: Record<1 | 2 | 3, { standard: number; express: number; deliverable: boolean }> = {
  1: { standard: 1, express: 1, deliverable: true },   // Metro cities — same/next day
  2: { standard: 3, express: 2, deliverable: true },   // Tier-2 cities — 2-4 days
  3: { standard: 7, express: 5, deliverable: true },   // Tier-3 / remote — 5-7 days
};
