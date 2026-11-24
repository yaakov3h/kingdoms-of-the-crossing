export type TroopDefinition = {name:string; role:string; hp:number; damage:number; range:number; gold:number; ore:number; crystal:number; growth:number; building:string; tier:number};
const troop=(name:string,role:string,hp:number,damage:number,range:number,gold:number,ore:number,crystal:number,growth:number,building:string,tier:number):TroopDefinition=>({name,role,hp,damage,range,gold,ore,crystal,growth,building,tier});
export const rosters:Record<string,TroopDefinition[]>={
 mars:[
  troop('סייר אבק','סיור',9,3,1,5,1,0,5,'center',0),troop('קרנף מאדים','מגן',18,4,1,9,2,0,3,'center',0),troop('רובוט הד','קלע',9,3,3,8,2,0,3,'center',0),
  troop('טריצרטופס מכני','פריצה',24,6,1,14,5,0,2,'workshop',1),troop('רחפן תיקון','תמיכה',13,3,3,11,1,3,2,'sanctuary',1),troop('מרגמת מסלול','ארטילריה',15,6,4,16,4,4,1,'observatory',1),troop('אנקילוזאור פלדה','מגן עילית',32,6,1,19,6,3,1,'barracks',2),troop('רקס הכוכבים','עילית',38,8,1,28,8,7,1,'barracks',2)
 ],
 crystal:[
  troop('גשש מנסרה','סיור',9,3,1,5,1,0,5,'center',0),troop('שומר קוורץ','מגן',16,4,1,8,2,0,3,'center',0),troop('קשת תהודה','קלע',8,3,3,8,1,1,3,'center',0),
  troop('גולם אמטיסט','פריצה',25,5,1,13,3,2,2,'workshop',1),troop('עש מנסרה','תמיכה',12,4,3,10,0,4,2,'sanctuary',1),troop('תותח תהודה','ארטילריה',16,5,4,15,2,5,1,'observatory',1),troop('ארמדיל קוורץ','מגן עילית',30,6,1,18,5,4,1,'barracks',2),troop('פיירוקריסטל','עילית',34,7,1,27,5,9,1,'barracks',2)
 ],
 grove:[
  troop('גשש עלה','סיור',11,3,1,5,1,0,5,'center',0),troop('אלון נודד','מגן',20,4,1,9,2,0,3,'center',0),troop('קלע גחליליות','קלע',10,3,3,8,1,1,3,'center',0),
  troop('חיפושית שורש','פריצה',26,5,1,13,4,1,2,'workshop',1),troop('עש הזיכרון','תמיכה',15,3,3,10,0,4,2,'sanctuary',1),troop('סופרת נבגים','ארטילריה',15,5,4,15,2,4,1,'observatory',1),troop('שומר סקוויה','מגן עילית',35,5,1,19,5,3,1,'barracks',2),troop('דרקון חופת היער','עילית',39,7,1,29,6,8,1,'barracks',2)
 ],
 tide:[
  troop('נווט שונית','סיור',9,3,1,5,1,0,5,'center',0),troop('סרטן קובלט','מגן',18,4,1,9,2,0,3,'center',0),troop('קלע זרמים','קלע',8,4,3,9,1,1,3,'center',0),
  troop('צב גירוסקופי','פריצה',25,5,1,13,5,0,2,'workshop',1),troop('מדוזת שדה','תמיכה',13,4,3,11,0,4,2,'sanctuary',1),troop('מנטת כבידה','ארטילריה',18,5,4,15,3,5,1,'observatory',1),troop('לובסטר מסלול','מגן עילית',31,6,1,19,6,3,1,'barracks',2),troop('לווייתן ירח','עילית',37,8,1,28,7,8,1,'barracks',2)
 ]
};
export const townNames:Record<string,Record<string,string>>={
 mars:{center:'מצודת האופק',barracks:'חצר הדינוזאורים',workshop:'מפעל גלגלי השחר',sanctuary:'מעבדת השיקום',observatory:'סוללת המסלול'},
 crystal:{center:'היכל המנסרה',barracks:'מדגרת הקוורץ',workshop:'סדנת התהודה',sanctuary:'גן כנפי המנסרה',observatory:'מגדל התדר'},
 grove:{center:'ספריית השורשים',barracks:'חצר העצים הנודדים',workshop:'בית החיפושיות',sanctuary:'חורשת הזיכרון',observatory:'מצפה הנבגים'},
 tide:{center:'מצודת הגאות',barracks:'חצר הקובלט',workshop:'מבדוק הגירוסקופים',sanctuary:'שונית השדות',observatory:'מספנת הכבידה'}
};
export const buildingPrerequisites:Record<string,{key:string;level:number}[]>={
 barracks:[],workshop:[{key:'barracks',level:1}],sanctuary:[{key:'barracks',level:1}],observatory:[{key:'workshop',level:1},{key:'sanctuary',level:1}]
};
