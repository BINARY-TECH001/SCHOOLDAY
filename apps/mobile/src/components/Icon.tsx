import Add from "iconsax-react-native/dist/esm/Add";
import ArrowLeft from "iconsax-react-native/dist/esm/ArrowLeft";
import ArrowRight from "iconsax-react-native/dist/esm/ArrowRight";
import Book1 from "iconsax-react-native/dist/esm/Book1";
import Calendar from "iconsax-react-native/dist/esm/Calendar";
import Clock from "iconsax-react-native/dist/esm/Clock";
import DocumentText from "iconsax-react-native/dist/esm/DocumentText";
import Home2 from "iconsax-react-native/dist/esm/Home2";
import Notification from "iconsax-react-native/dist/esm/Notification";
import People from "iconsax-react-native/dist/esm/People";
import Profile from "iconsax-react-native/dist/esm/Profile";
import Setting2 from "iconsax-react-native/dist/esm/Setting2";
import TickCircle from "iconsax-react-native/dist/esm/TickCircle";
import Wallet2 from "iconsax-react-native/dist/esm/Wallet2";
import Teacher from "iconsax-react-native/dist/esm/Teacher";
import SearchNormal1 from "iconsax-react-native/dist/esm/SearchNormal1";
import Logout from "iconsax-react-native/dist/esm/Logout";
import ArrowRight2 from "iconsax-react-native/dist/esm/ArrowRight2";
import CloseCircle from "iconsax-react-native/dist/esm/CloseCircle";
import Refresh from "iconsax-react-native/dist/esm/Refresh";
import Receipt21 from "iconsax-react-native/dist/esm/Receipt21";
import Camera from "iconsax-react-native/dist/esm/Camera";
import FingerScan from "iconsax-react-native/dist/esm/FingerScan";
import Location from "iconsax-react-native/dist/esm/Location";
import DocumentUpload from "iconsax-react-native/dist/esm/DocumentUpload";
import UserAdd from "iconsax-react-native/dist/esm/UserAdd";
import Card from "iconsax-react-native/dist/esm/Card";
import Chart from "iconsax-react-native/dist/esm/Chart";
import Building from "iconsax-react-native/dist/esm/Building";
import Verify from "iconsax-react-native/dist/esm/Verify";
import Gallery from "iconsax-react-native/dist/esm/Gallery";
import DirectSend from "iconsax-react-native/dist/esm/DirectSend";
import Eye from "iconsax-react-native/dist/esm/Eye";
import EyeSlash from "iconsax-react-native/dist/esm/EyeSlash";
import Edit from "iconsax-react-native/dist/esm/Edit";
import Flash from "iconsax-react-native/dist/esm/Flash";
import Sms from "iconsax-react-native/dist/esm/Sms";
import Lock from "iconsax-react-native/dist/esm/Lock";
import ShieldSecurity from "iconsax-react-native/dist/esm/ShieldSecurity";
import Filter from "iconsax-react-native/dist/esm/Filter";
import FilterSearch from "iconsax-react-native/dist/esm/FilterSearch";
import Call from "iconsax-react-native/dist/esm/Call";
import Task from "iconsax-react-native/dist/esm/Task";
import Message from "iconsax-react-native/dist/esm/Message";
import Share from "iconsax-react-native/dist/esm/Share";
import Trash from "iconsax-react-native/dist/esm/Trash";
import InfoCircle from "iconsax-react-native/dist/esm/InfoCircle";
import Microphone2 from "iconsax-react-native/dist/esm/Microphone2";
import AttachCircle from "iconsax-react-native/dist/esm/AttachCircle";
import MoneySend from "iconsax-react-native/dist/esm/MoneySend";

const icons = {
  add: Add,
  back: ArrowLeft,
  arrow: ArrowRight,
  book: Book1,
  calendar: Calendar,
  clock: Clock,
  document: DocumentText,
  home: Home2,
  notification: Notification,
  people: People,
  profile: Profile,
  settings: Setting2,
  check: TickCircle,
  wallet: Wallet2,
  school: Teacher,
  teacher: Teacher,
  search: SearchNormal1,
  logout: Logout,
  chevron: ArrowRight2,
  forward: ArrowRight2,
  close: CloseCircle,
  refresh: Refresh,
  receipt: Receipt21,
  camera: Camera,
  scan: FingerScan,
  location: Location,
  upload: DocumentUpload,
  userAdd: UserAdd,
  card: Card,
  chart: Chart,
  trending: Chart,
  building: Building,
  verify: Verify,
  gallery: Gallery,
  send: DirectSend,
  eye: Eye,
  eyeSlash: EyeSlash,
  edit: Edit,
  flash: Flash,
  sms: Sms,
  lock: Lock,
  shield: ShieldSecurity,
  filter: Filter,
  filterSearch: FilterSearch,
  call: Call,
  phone: Call,
  email: Sms,
  task: Task,
  message: Message,
  share: Share,
  moneySend: MoneySend,
  trash: Trash,
  info: InfoCircle,
  microphone: Microphone2,
  attach: AttachCircle,
};
export type IconName = keyof typeof icons;
export function Icon({
  name,
  size = 24,
  color = "#14213e",
  filled = false,
}: {
  name: IconName;
  size?: number;
  color?: string;
  filled?: boolean;
}) {
  const Component = icons[name] || icons.info;
  if (!Component) return null;
  return (
    <Component size={size} color={color} variant={filled ? "Bold" : "Linear"} />
  );
}
