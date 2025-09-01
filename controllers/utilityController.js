require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const countryList = async (req, res) => {
  try {
    const countries = [
      { id: 1, name: "Afghanistan", code: "AF" },
      { id: 2, name: "Albania", code: "AL" },
      { id: 3, name: "Algeria", code: "DZ" },
      { id: 4, name: "Andorra", code: "AD" },
      { id: 5, name: "Angola", code: "AO" },
      { id: 6, name: "Antigua and Barbuda", code: "AG" },
      { id: 7, name: "Argentina", code: "AR" },
      { id: 8, name: "Armenia", code: "AM" },
      { id: 9, name: "Australia", code: "AU" },
      { id: 10, name: "Austria", code: "AT" },
      { id: 11, name: "Azerbaijan", code: "AZ" },
      { id: 12, name: "Bahamas", code: "BS" },
      { id: 13, name: "Bahrain", code: "BH" },
      { id: 14, name: "Bangladesh", code: "BD" },
      { id: 15, name: "Barbados", code: "BB" },
      { id: 16, name: "Belarus", code: "BY" },
      { id: 17, name: "Belgium", code: "BE" },
      { id: 18, name: "Belize", code: "BZ" },
      { id: 19, name: "Benin", code: "BJ" },
      { id: 20, name: "Bhutan", code: "BT" },
      { id: 21, name: "Bolivia", code: "BO" },
      { id: 22, name: "Bosnia and Herzegovina", code: "BA" },
      { id: 23, name: "Botswana", code: "BW" },
      { id: 24, name: "Brazil", code: "BR" },
      { id: 25, name: "Brunei", code: "BN" },
      { id: 26, name: "Bulgaria", code: "BG" },
      { id: 27, name: "Burkina Faso", code: "BF" },
      { id: 28, name: "Burundi", code: "BI" },
      { id: 29, name: "Cabo Verde", code: "CV" },
      { id: 30, name: "Cambodia", code: "KH" },
      { id: 31, name: "Cameroon", code: "CM" },
      { id: 32, name: "Canada", code: "CA" },
      { id: 33, name: "Central African Republic", code: "CF" },
      { id: 34, name: "Chad", code: "TD" },
      { id: 35, name: "Chile", code: "CL" },
      { id: 36, name: "China", code: "CN" },
      { id: 37, name: "Colombia", code: "CO" },
      { id: 38, name: "Comoros", code: "KM" },
      { id: 39, name: "Congo (Congo-Brazzaville)", code: "CG" },
      { id: 40, name: "Costa Rica", code: "CR" },
      { id: 41, name: "Croatia", code: "HR" },
      { id: 42, name: "Cuba", code: "CU" },
      { id: 43, name: "Cyprus", code: "CY" },
      { id: 44, name: "Czech Republic", code: "CZ" },
      { id: 45, name: "Democratic Republic of the Congo", code: "CD" },
      { id: 46, name: "Denmark", code: "DK" },
      { id: 47, name: "Djibouti", code: "DJ" },
      { id: 48, name: "Dominica", code: "DM" },
      { id: 49, name: "Dominican Republic", code: "DO" },
      { id: 50, name: "Ecuador", code: "EC" },
      { id: 51, name: "Egypt", code: "EG" },
      { id: 52, name: "El Salvador", code: "SV" },
      { id: 53, name: "Equatorial Guinea", code: "GQ" },
      { id: 54, name: "Eritrea", code: "ER" },
      { id: 55, name: "Estonia", code: "EE" },
      { id: 56, name: "Eswatini", code: "SZ" },
      { id: 57, name: "Ethiopia", code: "ET" },
      { id: 58, name: "Fiji", code: "FJ" },
      { id: 59, name: "Finland", code: "FI" },
      { id: 60, name: "France", code: "FR" },
      { id: 61, name: "Gabon", code: "GA" },
      { id: 62, name: "Gambia", code: "GM" },
      { id: 63, name: "Georgia", code: "GE" },
      { id: 64, name: "Germany", code: "DE" },
      { id: 65, name: "Ghana", code: "GH" },
      { id: 66, name: "Greece", code: "GR" },
      { id: 67, name: "Grenada", code: "GD" },
      { id: 68, name: "Guatemala", code: "GT" },
      { id: 69, name: "Guinea", code: "GN" },
      { id: 70, name: "Guinea-Bissau", code: "GW" },
      { id: 71, name: "Guyana", code: "GY" },
      { id: 72, name: "Haiti", code: "HT" },
      { id: 73, name: "Honduras", code: "HN" },
      { id: 74, name: "Hungary", code: "HU" },
      { id: 75, name: "Iceland", code: "IS" },
      { id: 76, name: "India", code: "IN" },
      { id: 77, name: "Indonesia", code: "ID" },
      { id: 78, name: "Iran", code: "IR" },
      { id: 79, name: "Iraq", code: "IQ" },
      { id: 80, name: "Ireland", code: "IE" },
      { id: 81, name: "Israel", code: "IL" },
      { id: 82, name: "Italy", code: "IT" },
      { id: 83, name: "Jamaica", code: "JM" },
      { id: 84, name: "Japan", code: "JP" },
      { id: 85, name: "Jordan", code: "JO" },
      { id: 86, name: "Kazakhstan", code: "KZ" },
      { id: 87, name: "Kenya", code: "KE" },
      { id: 88, name: "Kiribati", code: "KI" },
      { id: 89, name: "Kuwait", code: "KW" },
      { id: 90, name: "Kyrgyzstan", code: "KG" },
      { id: 91, name: "Laos", code: "LA" },
      { id: 92, name: "Latvia", code: "LV" },
      { id: 93, name: "Lebanon", code: "LB" },
      { id: 94, name: "Lesotho", code: "LS" },
      { id: 95, name: "Liberia", code: "LR" },
      { id: 96, name: "Libya", code: "LY" },
      { id: 97, name: "Liechtenstein", code: "LI" },
      { id: 98, name: "Lithuania", code: "LT" },
      { id: 99, name: "Luxembourg", code: "LU" },
      { id: 100, name: "Madagascar", code: "MG" },
      { id: 101, name: "Malawi", code: "MW" },
      { id: 102, name: "Malaysia", code: "MY" },
      { id: 103, name: "Maldives", code: "MV" },
      { id: 104, name: "Mali", code: "ML" },
      { id: 105, name: "Malta", code: "MT" },
      { id: 106, name: "Marshall Islands", code: "MH" },
      { id: 107, name: "Mauritania", code: "MR" },
      { id: 108, name: "Mauritius", code: "MU" },
      { id: 109, name: "Mexico", code: "MX" },
      { id: 110, name: "Micronesia", code: "FM" },
      { id: 111, name: "Moldova", code: "MD" },
      { id: 112, name: "Monaco", code: "MC" },
      { id: 113, name: "Mongolia", code: "MN" },
      { id: 114, name: "Montenegro", code: "ME" },
      { id: 115, name: "Morocco", code: "MA" },
      { id: 116, name: "Mozambique", code: "MZ" },
      { id: 117, name: "Myanmar (Burma)", code: "MM" },
      { id: 118, name: "Namibia", code: "NA" },
      { id: 119, name: "Nauru", code: "NR" },
      { id: 120, name: "Nepal", code: "NP" },
      { id: 121, name: "Netherlands", code: "NL" },
      { id: 122, name: "New Zealand", code: "NZ" },
      { id: 123, name: "Nicaragua", code: "NI" },
      { id: 124, name: "Niger", code: "NE" },
      { id: 125, name: "Nigeria", code: "NG" },
      { id: 126, name: "North Korea", code: "KP" },
      { id: 127, name: "North Macedonia", code: "MK" },
      { id: 128, name: "Norway", code: "NO" },
      { id: 129, name: "Oman", code: "OM" },
      { id: 130, name: "Pakistan", code: "PK" },
      { id: 131, name: "Palau", code: "PW" },
      { id: 132, name: "Palestine", code: "PS" },
      { id: 133, name: "Panama", code: "PA" },
      { id: 134, name: "Papua New Guinea", code: "PG" },
      { id: 135, name: "Paraguay", code: "PY" },
      { id: 136, name: "Peru", code: "PE" },
      { id: 137, name: "Philippines", code: "PH" },
      { id: 138, name: "Poland", code: "PL" },
      { id: 139, name: "Portugal", code: "PT" },
      { id: 140, name: "Qatar", code: "QA" },
      { id: 141, name: "Romania", code: "RO" },
      { id: 142, name: "Russia", code: "RU" },
      { id: 143, name: "Rwanda", code: "RW" },
      { id: 144, name: "Saint Kitts and Nevis", code: "KN" },
      { id: 145, name: "Saint Lucia", code: "LC" },
      { id: 146, name: "Saint Vincent and the Grenadines", code: "VC" },
      { id: 147, name: "Samoa", code: "WS" },
      { id: 148, name: "San Marino", code: "SM" },
      { id: 149, name: "Sao Tome and Principe", code: "ST" },
      { id: 150, name: "Saudi Arabia", code: "SA" },
      { id: 151, name: "Senegal", code: "SN" },
      { id: 152, name: "Serbia", code: "RS" },
      { id: 153, name: "Seychelles", code: "SC" },
      { id: 154, name: "Sierra Leone", code: "SL" },
      { id: 155, name: "Singapore", code: "SG" },
      { id: 156, name: "Slovakia", code: "SK" },
      { id: 157, name: "Slovenia", code: "SI" },
      { id: 158, name: "Solomon Islands", code: "SB" },
      { id: 159, name: "Somalia", code: "SO" },
      { id: 160, name: "South Africa", code: "ZA" },
      { id: 161, name: "South Korea", code: "KR" },
      { id: 162, name: "South Sudan", code: "SS" },
      { id: 163, name: "Spain", code: "ES" },
      { id: 164, name: "Sri Lanka", code: "LK" },
      { id: 165, name: "Sudan", code: "SD" },
      { id: 166, name: "Suriname", code: "SR" },
      { id: 167, name: "Sweden", code: "SE" },
      { id: 168, name: "Switzerland", code: "CH" },
      { id: 169, name: "Syria", code: "SY" },
      { id: 170, name: "Taiwan", code: "TW" },
      { id: 171, name: "Tajikistan", code: "TJ" },
      { id: 172, name: "Tanzania", code: "TZ" },
      { id: 173, name: "Thailand", code: "TH" },
      { id: 174, name: "Timor-Leste", code: "TL" },
      { id: 175, name: "Togo", code: "TG" },
      { id: 176, name: "Tonga", code: "TO" },
      { id: 177, name: "Trinidad and Tobago", code: "TT" },
      { id: 178, name: "Tunisia", code: "TN" },
      { id: 179, name: "Turkey", code: "TR" },
      { id: 180, name: "Turkmenistan", code: "TM" },
      { id: 181, name: "Tuvalu", code: "TV" },
      { id: 182, name: "Uganda", code: "UG" },
      { id: 183, name: "Ukraine", code: "UA" },
      { id: 184, name: "United Arab Emirates", code: "AE" },
      { id: 185, name: "United Kingdom", code: "GB" },
      { id: 186, name: "United States", code: "US" },
      { id: 187, name: "Uruguay", code: "UY" },
      { id: 188, name: "Uzbekistan", code: "UZ" },
      { id: 189, name: "Vanuatu", code: "VU" },
      { id: 190, name: "Vatican City", code: "VA" },
      { id: 191, name: "Venezuela", code: "VE" },
      { id: 192, name: "Vietnam", code: "VN" },
      { id: 193, name: "Yemen", code: "YE" },
      { id: 194, name: "Zambia", code: "ZM" },
      { id: 195, name: "Zimbabwe", code: "ZW" },
    ];

    console.log(countries);
    res.json({ success: true, data: countries });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error fetching countries", error });
  }
};
const speciality = async (req, res) => {
  try {
    const specialityList = await prisma.specialityDepartment.findMany({
      orderBy: { specialityDepartmentName: "asc" },
    });

    res.json({ success: true, data: specialityList });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error fetching speciality", error });
  }
};
const title = async (req, res) => {
  try {
    const titles = await prisma.title.findMany({
      orderBy: { name: "asc" },
    });

    res.json({ success: true, data: titles });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error fetching Titles", error });
  }
};
const accomodation = async (req, res) => {
  try {
    const accomodationList = await prisma.accommodationCharges.findMany({
      orderBy: { accommodationType: "asc" },
    });

    res.json({ success: true, data: accomodationList });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error fetching Accomodations", error });
  }
};
const conferenceFees = async (req, res) => {
  try {
    const feesList = await prisma.conferenceFees.findMany({
      orderBy: { memberType: "asc" },
    });

    // separate out accompanying person
    const accompanyingPerson = feesList.find(
      (fee) => fee.memberType.toLowerCase() === "accompanying person"
    );

    // all other fees
    const otherFees = feesList.filter(
      (fee) => fee.memberType.toLowerCase() !== "accompanying person"
    );

    res.json({
      success: true,
      data: {
        fees: otherFees,
        accompanyingPerson,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error fetching fees", error });
  }
};
const workshop = async (req, res) => {
  try {
    const workShopList = await prisma.workShop.findMany({
      orderBy: { workShop: "asc" },
    });

    res.json({ success: true, data: workShopList });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error fetching workshop", error });
  }
};
const abstractTheme = async (req, res) => {
  try {
    const themeList = await prisma.absTheme.findMany({
      orderBy: { themeName: "asc" },
    });

    res.json({ success: true, data: themeList });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error fetching theme", error });
  }
};
const abstractCategory = async (req, res) => {
  try {
    const category = await prisma.absCategory.findMany({
      orderBy: { category: "asc" },
    });

    res.json({ success: true, data: category });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error fetching category", error });
  }
};

module.exports = {
  countryList,
  speciality,
  accomodation,
  title,
  conferenceFees,
  workshop,
  abstractTheme,
  abstractCategory,
};
