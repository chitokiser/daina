/* /public/assets/js/regions.js */
export const PROVINCES = [
  { code:"HN", name:"Hà Nội", cities:["Hoàn Kiếm","Ba Đình","Cầu Giấy","Nam Từ Liêm","Long Biên","Hà Đông","Sóc Sơn","Đông Anh"] },
  { code:"HCM", name:"TP. Hồ Chí Minh", cities:["Quận 1","Quận 3","Quận 7","Thủ Đức","Bình Thạnh","Tân Bình","Gò Vấp"] },
  { code:"DN", name:"Đà Nẵng", cities:["Hải Châu","Sơn Trà","Ngũ Hành Sơn","Thanh Khê","Liên Chiểu"] },
  { code:"HP", name:"Hải Phòng", cities:["Hồng Bàng","Lê Chân","Ngô Quyền","Hải An"] },
  { code:"QN", name:"Quảng Ninh", cities:["Hạ Long","Cẩm Phả","Uông Bí","Móng Cái"] },
  { code:"BD", name:"Bình Dương", cities:["Thủ Dầu Một","Dĩ An","Thuận An","Tân Uyên"] },
  { code:"DNA", name:"Đồng Nai", cities:["Biên Hòa","Long Khánh","Trảng Bom"] },
  { code:"LA", name:"Long An", cities:["Tân An","Bến Lức","Đức Hòa"] },
  { code:"KH", name:"Khánh Hòa", cities:["Nha Trang","Cam Ranh"] },
  { code:"TH", name:"Thanh Hóa", cities:["Thanh Hóa","Sầm Sơn"] },
  { code:"NA", name:"Nghệ An", cities:["Vinh","Cửa Lò"] }
];

export function fillProvinceSelect(sel){
  if(!sel) return;
  sel.innerHTML = '<option value="">선택</option>' + PROVINCES.map(p=>`<option value="${p.code}">${p.name}</option>`).join("");
}

export function fillCitySelect(sel, provCode){
  if(!sel) return;
  const p = PROVINCES.find(x=>x.code===provCode);
  const cities = p ? p.cities : [];
  sel.innerHTML = '<option value="">선택</option>' + cities.map(c=>`<option value="${c}">${c}</option>`).join("");
}
