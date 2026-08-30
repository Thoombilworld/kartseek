'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronDown, Search, MapPin, CheckCircle2 } from 'lucide-react';

// ─── Static data (28 states + 8 UTs with districts) ──────────────────────────

interface StateEntry {
  code: string;
  name: string;
  capital: string;
  isUT: boolean;
  districts: string[];
}

const INDIA_STATE_DISTRICT_DATA: StateEntry[] = [
  { code: 'AP', name: 'Andhra Pradesh', capital: 'Amaravati', isUT: false, districts: ['Anantapur', 'Chittoor', 'East Godavari', 'Guntur', 'Krishna', 'Kurnool', 'Nellore', 'Prakasam', 'Srikakulam', 'Tirupati', 'Visakhapatnam', 'Vizianagaram', 'West Godavari', 'YSR Kadapa'] },
  { code: 'AR', name: 'Arunachal Pradesh', capital: 'Itanagar', isUT: false, districts: ['Anjaw', 'Changlang', 'Dibang Valley', 'East Kameng', 'East Siang', 'Itanagar', 'Kra Daadi', 'Kurung Kumey', 'Lohit', 'Longding', 'Lower Dibang Valley', 'Lower Siang', 'Lower Subansiri', 'Namsai', 'Pakke-Kessang', 'Papum Pare', 'Shi Yomi', 'Siang', 'Tawang', 'Tirap', 'Upper Dibang Valley', 'Upper Siang', 'Upper Subansiri', 'West Kameng', 'West Siang'] },
  { code: 'AS', name: 'Assam', capital: 'Dispur', isUT: false, districts: ['Bajali', 'Baksa', 'Barpeta', 'Biswanath', 'Bongaigaon', 'Cachar', 'Charaideo', 'Chirang', 'Darrang', 'Dhemaji', 'Dhubri', 'Dibrugarh', 'Dima Hasao', 'Goalpara', 'Golaghat', 'Hailakandi', 'Hojai', 'Jorhat', 'Kamrup', 'Kamrup Metropolitan', 'Karbi Anglong', 'Karimganj', 'Kokrajhar', 'Lakhimpur', 'Majuli', 'Morigaon', 'Nagaon', 'Nalbari', 'Sivasagar', 'Sonitpur', 'South Salmara-Mankachar', 'Tamulpur', 'Tinsukia', 'Udalguri', 'West Karbi Anglong'] },
  { code: 'BR', name: 'Bihar', capital: 'Patna', isUT: false, districts: ['Araria', 'Arwal', 'Aurangabad', 'Banka', 'Begusarai', 'Bhagalpur', 'Bhojpur', 'Buxar', 'Darbhanga', 'East Champaran', 'Gaya', 'Gopalganj', 'Jamui', 'Jehanabad', 'Kaimur', 'Katihar', 'Khagaria', 'Kishanganj', 'Lakhisarai', 'Madhepura', 'Madhubani', 'Munger', 'Muzaffarpur', 'Nalanda', 'Nawada', 'Patna', 'Purnia', 'Rohtas', 'Saharsa', 'Samastipur', 'Saran', 'Sheikhpura', 'Sheohar', 'Sitamarhi', 'Siwan', 'Supaul', 'Vaishali', 'West Champaran'] },
  { code: 'CG', name: 'Chhattisgarh', capital: 'Raipur', isUT: false, districts: ['Balod', 'Baloda Bazar', 'Balrampur', 'Bastar', 'Bemetara', 'Bijapur', 'Bilaspur', 'Dantewada', 'Dhamtari', 'Durg', 'Gariaband', 'Gaurela-Pendra-Marwahi', 'Janjgir-Champa', 'Jashpur', 'Kabirdham', 'Kanker', 'Kondagaon', 'Korba', 'Koriya', 'Mahasamund', 'Manendragarh', 'Mohla-Manpur', 'Mungetwar', 'Narayanpur', 'Raigarh', 'Raipur', 'Rajnandgaon', 'Sakti', 'Sarangarh-Bilaigarh', 'Sukma', 'Surajpur', 'Surguja'] },
  { code: 'GA', name: 'Goa', capital: 'Panaji', isUT: false, districts: ['North Goa', 'South Goa'] },
  { code: 'GJ', name: 'Gujarat', capital: 'Gandhinagar', isUT: false, districts: ['Ahmedabad', 'Amreli', 'Anand', 'Aravalli', 'Banaskantha', 'Bharuch', 'Bhavnagar', 'Botad', 'Chhota Udaipur', 'Dahod', 'Dang', 'Devbhoomi Dwarka', 'Gandhinagar', 'Gir Somnath', 'Jamnagar', 'Junagadh', 'Kheda', 'Kutch', 'Mahisagar', 'Mehsana', 'Morbi', 'Narmada', 'Navsari', 'Panchmahal', 'Patan', 'Porbandar', 'Rajkot', 'Sabarkantha', 'Surat', 'Surendranagar', 'Tapi', 'Vadodara', 'Valsad'] },
  { code: 'HR', name: 'Haryana', capital: 'Chandigarh', isUT: false, districts: ['Ambala', 'Bhiwani', 'Charkhi Dadri', 'Faridabad', 'Fatehabad', 'Gurugram', 'Hisar', 'Jhajjar', 'Jind', 'Kaithal', 'Karnal', 'Kurukshetra', 'Mahendragarh', 'Nuh', 'Palwal', 'Panchkula', 'Panipat', 'Rewari', 'Rohtak', 'Sirsa', 'Sonipat', 'Yamunanagar'] },
  { code: 'HP', name: 'Himachal Pradesh', capital: 'Shimla', isUT: false, districts: ['Bilaspur', 'Chamba', 'Hamirpur', 'Kangra', 'Kinnaur', 'Kullu', 'Lahaul and Spiti', 'Mandi', 'Shimla', 'Sirmaur', 'Solan', 'Una'] },
  { code: 'JH', name: 'Jharkhand', capital: 'Ranchi', isUT: false, districts: ['Bokaro', 'Chatra', 'Deoghar', 'Dhanbad', 'Dumka', 'East Singhbhum', 'Garhwa', 'Giridih', 'Godda', 'Gumla', 'Hazaribagh', 'Jamtara', 'Khunti', 'Koderma', 'Latehar', 'Lohardaga', 'Pakur', 'Palamu', 'Ramgarh', 'Ranchi', 'Sahebganj', 'Seraikela Kharsawan', 'Simdega', 'West Singhbhum'] },
  { code: 'KA', name: 'Karnataka', capital: 'Bengaluru', isUT: false, districts: ['Bagalkot', 'Ballari', 'Belagavi', 'Bengaluru Rural', 'Bengaluru Urban', 'Bidar', 'Chamarajanagar', 'Chikkaballapur', 'Chikkamagaluru', 'Chitradurga', 'Dakshina Kannada', 'Davanagere', 'Dharwad', 'Gadag', 'Hassan', 'Haveri', 'Kalaburagi', 'Kodagu', 'Kolar', 'Koppal', 'Mandya', 'Mysuru', 'Raichur', 'Ramanagara', 'Shivamogga', 'Tumakuru', 'Udupi', 'Uttara Kannada', 'Vijayapura', 'Yadgir'] },
  { code: 'KL', name: 'Kerala', capital: 'Thiruvananthapuram', isUT: false, districts: ['Alappuzha', 'Ernakulam', 'Idukki', 'Kannur', 'Kasaragod', 'Kollam', 'Kottayam', 'Kozhikode', 'Malappuram', 'Palakkad', 'Pathanamthitta', 'Thiruvananthapuram', 'Thrissur', 'Wayanad'] },
  { code: 'MP', name: 'Madhya Pradesh', capital: 'Bhopal', isUT: false, districts: ['Agar Malwa', 'Alirajpur', 'Anuppur', 'Ashoknagar', 'Balaghat', 'Barwani', 'Betul', 'Bhind', 'Bhopal', 'Burhanpur', 'Chhatarpur', 'Chhindwara', 'Damoh', 'Datia', 'Dewas', 'Dhar', 'Dindori', 'Guna', 'Gwalior', 'Harda', 'Hoshangabad', 'Indore', 'Jabalpur', 'Jhabua', 'Katni', 'Khandwa', 'Khargone', 'Mandla', 'Mandsaur', 'Morena', 'Narsinghpur', 'Neemuch', 'Niwari', 'Panna', 'Raisen', 'Rajgarh', 'Ratlam', 'Rewa', 'Sagar', 'Satna', 'Sehore', 'Seoni', 'Shahdol', 'Shajapur', 'Sheopur', 'Shivpuri', 'Sidhi', 'Singrauli', 'Tikamgarh', 'Ujjain', 'Umaria', 'Vidisha'] },
  { code: 'MH', name: 'Maharashtra', capital: 'Mumbai', isUT: false, districts: ['Ahmednagar', 'Akola', 'Amravati', 'Aurangabad', 'Beed', 'Bhandara', 'Buldhana', 'Chandrapur', 'Dhule', 'Gadchiroli', 'Gondia', 'Hingoli', 'Jalgaon', 'Jalna', 'Kolhapur', 'Latur', 'Mumbai City', 'Mumbai Suburban', 'Nagpur', 'Nanded', 'Nandurbar', 'Nashik', 'Osmanabad', 'Palghar', 'Parbhani', 'Pune', 'Raigad', 'Ratnagiri', 'Sangli', 'Satara', 'Sindhudurg', 'Solapur', 'Thane', 'Wardha', 'Washim', 'Yavatmal'] },
  { code: 'MN', name: 'Manipur', capital: 'Imphal', isUT: false, districts: ['Bishnupur', 'Chandel', 'Churachandpur', 'Imphal East', 'Imphal West', 'Jiribam', 'Kakching', 'Kamjong', 'Kangpokpi', 'Noney', 'Pherzawl', 'Senapati', 'Tamenglong', 'Tengnoupal', 'Thoubal', 'Ukhrul'] },
  { code: 'ML', name: 'Meghalaya', capital: 'Shillong', isUT: false, districts: ['East Garo Hills', 'East Jaintia Hills', 'East Khasi Hills', 'Eastern West Khasi Hills', 'North Garo Hills', 'Ri Bhoi', 'South Garo Hills', 'South West Garo Hills', 'South West Khasi Hills', 'West Garo Hills', 'West Jaintia Hills', 'West Khasi Hills'] },
  { code: 'MZ', name: 'Mizoram', capital: 'Aizawl', isUT: false, districts: ['Aizawl', 'Champhai', 'Hnahthial', 'Khawzawl', 'Kolasib', 'Lawngtlai', 'Lunglei', 'Mamit', 'Saiha', 'Saitual', 'Serchhip'] },
  { code: 'NL', name: 'Nagaland', capital: 'Kohima', isUT: false, districts: ['Chumoukedima', 'Dimapur', 'Kiphire', 'Kohima', 'Longleng', 'Mokokchung', 'Mon', 'Niuland', 'Noklak', 'Peren', 'Phek', 'Shamator', 'Tseminyu', 'Tuensang', 'Wokha', 'Zunheboto'] },
  { code: 'OD', name: 'Odisha', capital: 'Bhubaneswar', isUT: false, districts: ['Angul', 'Balangir', 'Balasore', 'Bargarh', 'Bhadrak', 'Boudh', 'Cuttack', 'Deogarh', 'Dhenkanal', 'Gajapati', 'Ganjam', 'Jagatsinghpur', 'Jajpur', 'Jharsuguda', 'Kalahandi', 'Kandhamal', 'Kendrapara', 'Kendujhar', 'Khordha', 'Koraput', 'Malkangiri', 'Mayurbhanj', 'Nabarangpur', 'Nayagarh', 'Nuapada', 'Puri', 'Rayagada', 'Sambalpur', 'Subarnapur', 'Sundargarh'] },
  { code: 'PB', name: 'Punjab', capital: 'Chandigarh', isUT: false, districts: ['Amritsar', 'Barnala', 'Bathinda', 'Faridkot', 'Fatehgarh Sahib', 'Fazilka', 'Ferozepur', 'Gurdaspur', 'Hoshiarpur', 'Jalandhar', 'Kapurthala', 'Ludhiana', 'Malerkotla', 'Mansa', 'Moga', 'Mohali', 'Muktsar', 'Nawanshahr', 'Pathankot', 'Patiala', 'Rupnagar', 'Sangrur', 'Tarn Taran'] },
  { code: 'RJ', name: 'Rajasthan', capital: 'Jaipur', isUT: false, districts: ['Ajmer', 'Alwar', 'Banswara', 'Baran', 'Barmer', 'Bharatpur', 'Bhilwara', 'Bikaner', 'Bundi', 'Chittorgarh', 'Churu', 'Dausa', 'Dholpur', 'Dungarpur', 'Hanumangarh', 'Jaipur', 'Jaisalmer', 'Jalore', 'Jhalawar', 'Jhunjhunu', 'Jodhpur', 'Karauli', 'Kota', 'Nagaur', 'Pali', 'Pratapgarh', 'Rajsamand', 'Sawai Madhopur', 'Sikar', 'Sirohi', 'Sri Ganganagar', 'Tonk', 'Udaipur'] },
  { code: 'SK', name: 'Sikkim', capital: 'Gangtok', isUT: false, districts: ['East Sikkim', 'North Sikkim', 'Pakyong', 'Soreng', 'South Sikkim', 'West Sikkim'] },
  { code: 'TN', name: 'Tamil Nadu', capital: 'Chennai', isUT: false, districts: ['Ariyalur', 'Chengalpattu', 'Chennai', 'Coimbatore', 'Cuddalore', 'Dharmapuri', 'Dindigul', 'Erode', 'Kallakurichi', 'Kanchipuram', 'Kanyakumari', 'Karur', 'Krishnagiri', 'Madurai', 'Mayiladuthurai', 'Nagapattinam', 'Namakkal', 'Nilgiris', 'Perambalur', 'Pudukkottai', 'Ramanathapuram', 'Ranipet', 'Salem', 'Sivaganga', 'Tenkasi', 'Thanjavur', 'Theni', 'Thoothukudi', 'Tiruchirappalli', 'Tirunelveli', 'Tirupathur', 'Tiruppur', 'Tiruvallur', 'Tiruvannamalai', 'Tiruvarur', 'Vellore', 'Viluppuram', 'Virudhunagar'] },
  { code: 'TG', name: 'Telangana', capital: 'Hyderabad', isUT: false, districts: ['Adilabad', 'Bhadradri Kothagudem', 'Hanamkonda', 'Hyderabad', 'Jagtial', 'Jangaon', 'Jayashankar Bhupalpally', 'Jogulamba Gadwal', 'Kamareddy', 'Karimnagar', 'Khammam', 'Kumuram Bheem', 'Mahabubabad', 'Mahabubnagar', 'Mancherial', 'Medak', 'Medchal-Malkajgiri', 'Mulugu', 'Nagarkurnool', 'Nalgonda', 'Narayanpet', 'Nirmal', 'Nizamabad', 'Peddapalli', 'Rajanna Sircilla', 'Rangareddy', 'Sangareddy', 'Siddipet', 'Suryapet', 'Vikarabad', 'Wanaparthy', 'Warangal', 'Yadadri Bhuvanagiri'] },
  { code: 'TR', name: 'Tripura', capital: 'Agartala', isUT: false, districts: ['Dhalai', 'Gomati', 'Khowai', 'North Tripura', 'Sepahijala', 'South Tripura', 'Unakoti', 'West Tripura'] },
  { code: 'UP', name: 'Uttar Pradesh', capital: 'Lucknow', isUT: false, districts: ['Agra', 'Aligarh', 'Ambedkar Nagar', 'Amethi', 'Amroha', 'Auraiya', 'Ayodhya', 'Azamgarh', 'Baghpat', 'Bahraich', 'Ballia', 'Balrampur', 'Banda', 'Barabanki', 'Bareilly', 'Basti', 'Bijnor', 'Budaun', 'Bulandshahr', 'Chandauli', 'Chitrakoot', 'Deoria', 'Etah', 'Etawah', 'Farrukhabad', 'Fatehpur', 'Firozabad', 'Gautam Buddha Nagar', 'Ghaziabad', 'Ghazipur', 'Gonda', 'Gorakhpur', 'Hamirpur', 'Hapur', 'Hardoi', 'Hathras', 'Jalaun', 'Jaunpur', 'Jhansi', 'Kannauj', 'Kanpur Dehat', 'Kanpur Nagar', 'Kasganj', 'Kaushambi', 'Kushinagar', 'Lakhimpur Kheri', 'Lalitpur', 'Lucknow', 'Maharajganj', 'Mahoba', 'Mainpuri', 'Mathura', 'Mau', 'Meerut', 'Mirzapur', 'Moradabad', 'Muzaffarnagar', 'Pilibhit', 'Pratapgarh', 'Prayagraj', 'Raebareli', 'Rampur', 'Saharanpur', 'Sambhal', 'Sant Kabir Nagar', 'Shahjahanpur', 'Shamli', 'Shravasti', 'Siddharthnagar', 'Sitapur', 'Sonbhadra', 'Sultanpur', 'Unnao', 'Varanasi'] },
  { code: 'UK', name: 'Uttarakhand', capital: 'Dehradun', isUT: false, districts: ['Almora', 'Bageshwar', 'Chamoli', 'Champawat', 'Dehradun', 'Haridwar', 'Nainital', 'Pauri Garhwal', 'Pithoragarh', 'Rudraprayag', 'Tehri Garhwal', 'Udham Singh Nagar', 'Uttarkashi'] },
  { code: 'WB', name: 'West Bengal', capital: 'Kolkata', isUT: false, districts: ['Alipurduar', 'Bankura', 'Birbhum', 'Cooch Behar', 'Dakshin Dinajpur', 'Darjeeling', 'Hooghly', 'Howrah', 'Jalpaiguri', 'Jhargram', 'Kalimpong', 'Kolkata', 'Malda', 'Murshidabad', 'Nadia', 'North 24 Parganas', 'Paschim Bardhaman', 'Paschim Medinipur', 'Purba Bardhaman', 'Purba Medinipur', 'Purulia', 'South 24 Parganas', 'Uttar Dinajpur'] },
  // Union Territories
  { code: 'AN', name: 'Andaman & Nicobar Islands', capital: 'Port Blair', isUT: true, districts: ['Nicobar', 'North and Middle Andaman', 'South Andaman'] },
  { code: 'CH', name: 'Chandigarh', capital: 'Chandigarh', isUT: true, districts: ['Chandigarh'] },
  { code: 'DN', name: 'Dadra & Nagar Haveli and Daman & Diu', capital: 'Daman', isUT: true, districts: ['Dadra and Nagar Haveli', 'Daman', 'Diu'] },
  { code: 'DL', name: 'Delhi', capital: 'New Delhi', isUT: true, districts: ['Central Delhi', 'East Delhi', 'New Delhi', 'North Delhi', 'North East Delhi', 'North West Delhi', 'Shahdara', 'South Delhi', 'South East Delhi', 'South West Delhi', 'West Delhi'] },
  { code: 'JK', name: 'Jammu & Kashmir', capital: 'Srinagar', isUT: true, districts: ['Anantnag', 'Bandipora', 'Baramulla', 'Budgam', 'Doda', 'Ganderbal', 'Jammu', 'Kathua', 'Kishtwar', 'Kulgam', 'Kupwara', 'Poonch', 'Pulwama', 'Rajouri', 'Ramban', 'Reasi', 'Samba', 'Shopian', 'Srinagar', 'Udhampur'] },
  { code: 'LA', name: 'Ladakh', capital: 'Leh', isUT: true, districts: ['Kargil', 'Leh'] },
  { code: 'LD', name: 'Lakshadweep', capital: 'Kavaratti', isUT: true, districts: ['Lakshadweep'] },
  { code: 'PY', name: 'Puducherry', capital: 'Puducherry', isUT: true, districts: ['Karaikal', 'Mahe', 'Puducherry', 'Yanam'] },
].sort((a, b) => a.name.localeCompare(b.name));

// ─── Component ────────────────────────────────────────────────────────────────

interface StateDistrictSelectorProps {
  /** Called when state + district are selected */
  onChange?: (state: string, stateCode: string, district: string) => void;
  /** Show state code badge */
  showStateCodes?: boolean;
  /** Default state code */
  defaultStateCode?: string;
  /** Default district */
  defaultDistrict?: string;
  /** Required fields */
  required?: boolean;
  /** ID prefix for accessibility */
  id?: string;
  /** Compact mode */
  compact?: boolean;
}

export default function StateDistrictSelector({
  onChange,
  showStateCodes = true,
  defaultStateCode = '',
  defaultDistrict = '',
  required = false,
  id = 'state-district',
  compact = false,
}: StateDistrictSelectorProps) {
  const [selectedState, setSelectedState] = useState<StateEntry | null>(
    INDIA_STATE_DISTRICT_DATA.find(s => s.code === defaultStateCode) ?? null
  );
  const [selectedDistrict, setSelectedDistrict] = useState(defaultDistrict);
  const [stateOpen, setStateOpen] = useState(false);
  const [districtOpen, setDistrictOpen] = useState(false);
  const [stateSearch, setStateSearch] = useState('');
  const [districtSearch, setDistrictSearch] = useState('');
  const stateRef = useRef<HTMLDivElement>(null);
  const districtRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!stateRef.current?.contains(e.target as Node)) setStateOpen(false);
      if (!districtRef.current?.contains(e.target as Node)) setDistrictOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredStates = useMemo(() =>
    INDIA_STATE_DISTRICT_DATA.filter(s =>
      s.name.toLowerCase().includes(stateSearch.toLowerCase()) ||
      s.code.toLowerCase().includes(stateSearch.toLowerCase())
    ), [stateSearch]);

  const filteredDistricts = useMemo(() =>
    (selectedState?.districts ?? []).filter(d =>
      d.toLowerCase().includes(districtSearch.toLowerCase())
    ), [selectedState, districtSearch]);

  const handleStateSelect = (state: StateEntry) => {
    setSelectedState(state);
    setSelectedDistrict('');
    setStateOpen(false);
    setStateSearch('');
    onChange?.(state.name, state.code, '');
  };

  const handleDistrictSelect = (district: string) => {
    setSelectedDistrict(district);
    setDistrictOpen(false);
    setDistrictSearch('');
    onChange?.(selectedState!.name, selectedState!.code, district);
  };

  const inputCls = 'w-full flex items-center justify-between px-3 py-2.5 border border-slate-300 rounded-xl text-sm bg-white hover:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all cursor-pointer';

  return (
    <div className={`${compact ? 'flex gap-3' : 'space-y-4'}`} id={`${id}-wrapper`}>

      {/* ── State Selector ─────────────────────────────────────────────────── */}
      <div className={compact ? 'flex-1' : 'space-y-1.5'} ref={stateRef}>
        {!compact && (
          <label htmlFor={`${id}-state-btn`} className="block text-sm font-semibold text-slate-700">
            State / Union Territory
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          <button
            id={`${id}-state-btn`}
            type="button"
            onClick={() => { setStateOpen(o => !o); setDistrictOpen(false); }}
            className={inputCls}
            aria-haspopup="listbox"
            aria-expanded={stateOpen}
          >
            <span className={selectedState ? 'text-slate-800 font-medium' : 'text-slate-400'}>
              {selectedState ? (
                <span className="flex items-center gap-2">
                  {showStateCodes && <span className="text-[11px] bg-orange-100 text-orange-700 px-1.5 rounded font-black">{selectedState.code}</span>}
                  {selectedState.name}
                  {selectedState.isUT && <span className="text-[10px] text-slate-400">(UT)</span>}
                </span>
              ) : compact ? 'State' : 'Select State or Union Territory'}
            </span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${stateOpen ? 'rotate-180' : ''}`} />
          </button>

          {stateOpen && (
            <div className="absolute z-50 top-full mt-1.5 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
              <div className="p-2 border-b border-slate-100">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    autoFocus
                    type="text"
                    value={stateSearch}
                    onChange={e => setStateSearch(e.target.value)}
                    placeholder="Search state..."
                    className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
              </div>
              <div className="max-h-60 overflow-y-auto">
                {/* States */}
                <p className="px-3 py-1.5 text-[10px] font-black text-slate-400 uppercase tracking-wider bg-slate-50">States (28)</p>
                {filteredStates.filter(s => !s.isUT).map(state => (
                  <button
                    key={state.code}
                    type="button"
                    onClick={() => handleStateSelect(state)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-orange-50 transition-colors ${selectedState?.code === state.code ? 'bg-orange-50 text-orange-700' : 'text-slate-700'}`}
                  >
                    {showStateCodes && <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 rounded font-black w-8 text-center">{state.code}</span>}
                    <span className="flex-1 font-medium">{state.name}</span>
                    {selectedState?.code === state.code && <CheckCircle2 className="w-3.5 h-3.5 text-orange-500" />}
                  </button>
                ))}
                {/* Union Territories */}
                <p className="px-3 py-1.5 text-[10px] font-black text-slate-400 uppercase tracking-wider bg-slate-50">Union Territories (8)</p>
                {filteredStates.filter(s => s.isUT).map(state => (
                  <button
                    key={state.code}
                    type="button"
                    onClick={() => handleStateSelect(state)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-orange-50 transition-colors ${selectedState?.code === state.code ? 'bg-orange-50 text-orange-700' : 'text-slate-700'}`}
                  >
                    {showStateCodes && <span className="text-[10px] bg-orange-50 text-orange-600 px-1.5 rounded font-black w-8 text-center">{state.code}</span>}
                    <span className="flex-1 font-medium">{state.name}</span>
                    <span className="text-[10px] text-slate-400">UT</span>
                    {selectedState?.code === state.code && <CheckCircle2 className="w-3.5 h-3.5 text-orange-500" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── District Selector ──────────────────────────────────────────────── */}
      <div className={compact ? 'flex-1' : 'space-y-1.5'} ref={districtRef}>
        {!compact && (
          <label htmlFor={`${id}-district-btn`} className="block text-sm font-semibold text-slate-700">
            District
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          <button
            id={`${id}-district-btn`}
            type="button"
            disabled={!selectedState}
            onClick={() => { setDistrictOpen(o => !o); setStateOpen(false); }}
            className={`${inputCls} ${!selectedState ? 'opacity-50 cursor-not-allowed' : ''}`}
            aria-haspopup="listbox"
            aria-expanded={districtOpen}
          >
            <span className={selectedDistrict ? 'text-slate-800 font-medium' : 'text-slate-400'}>
              {selectedDistrict || (compact ? 'District' : (selectedState ? 'Select District' : 'Select state first'))}
            </span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${districtOpen ? 'rotate-180' : ''}`} />
          </button>

          {districtOpen && selectedState && (
            <div className="absolute z-50 top-full mt-1.5 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
              <div className="p-2 border-b border-slate-100">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    autoFocus
                    type="text"
                    value={districtSearch}
                    onChange={e => setDistrictSearch(e.target.value)}
                    placeholder="Search district..."
                    className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
              </div>
              <div className="max-h-60 overflow-y-auto">
                <p className="px-3 py-1.5 text-[10px] font-black text-slate-400 uppercase bg-slate-50">
                  {selectedState.name} — {filteredDistricts.length} districts
                </p>
                {filteredDistricts.map(district => (
                  <button
                    key={district}
                    type="button"
                    onClick={() => handleDistrictSelect(district)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-orange-50 transition-colors ${selectedDistrict === district ? 'bg-orange-50 text-orange-700 font-semibold' : 'text-slate-700'}`}
                  >
                    <MapPin className="w-3 h-3 text-slate-300" />
                    <span className="flex-1">{district}</span>
                    {selectedDistrict === district && <CheckCircle2 className="w-3.5 h-3.5 text-orange-500" />}
                  </button>
                ))}
                {filteredDistricts.length === 0 && (
                  <p className="px-3 py-4 text-sm text-slate-400 text-center">No districts found</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
