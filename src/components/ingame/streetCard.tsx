import RailIcon from "../../../public/rails.png";
import ElectricityIcon from "../../../public/elects.png";
import WaterIcon from "../../../public/water.png";

export interface StreetDisplayInfo {
    title: string;
    rent: number;
    rentWithColorSet: number;
    multpliedrent: [number, number, number, number, number];
    housesCost: number;
    hotelsCost: number;
    cardCost: number;
    group: string;
}

export interface UtilitiesDisplayInfo {
    title: string;
    cardCost: number;
    type: "water" | "electricity";
}
export interface RailroadDisplayInfo {
    title: string;
    cardCost: number;
}
export function translateGroup(s: string) {
    try {
        switch (s.toLowerCase()) {
            case "red":
                return "#ED1B24";
            case "darkgreen":
                return "#1FB25A";
            case "darkblue":
                return "#0072BB";
            case "yellow":
                return "#FEF200";
            case "purple":
                return "#955436";
            case "lightgreen":
                return "#AAE0FA";
            case "orange":
                return "#F7941D";
            case "violet":
                return "#D93A96";
            default:
                return s.toLowerCase();
        }
    } catch {
        return s;
    }
}
export default function selector({
    street,
    utility,
    railroad,
}: {
    street?: StreetDisplayInfo;
    utility?: UtilitiesDisplayInfo;
    railroad?: RailroadDisplayInfo;
}) {
    if (street !== undefined) {
        return <StreetCard args={street} />;
    } else if (utility !== undefined) {
        return <UtilityCard args={utility} />;
    } else if (railroad !== undefined) {
        return <RailroadCard args={railroad} />;
    } else {
        return <></>;
    }
}

function StreetCard({ args }: { args: StreetDisplayInfo }) {
    const _color = translateGroup(args.group);
    return (
        <div className="street-card">
            <div style={{ backgroundColor: _color }}>
                <p>BẰNG KHOÁN</p>
                <h3>{args.title}</h3>
            </div>
            <div>
                <ol>
                    <li>
                        <p>Đóng góp</p>
                        <p>{args.rent} GTTD</p>
                    </li>
                    <li>
                        <p>Đóng góp cả bộ</p>
                        <p>{args.rentWithColorSet} GTTD</p>
                    </li>
                    <li>
                        <p>Đóng góp với 1 nhà</p>
                        <p>{args.multpliedrent[0]} GTTD</p>
                    </li>
                    <li>
                        <p>Đóng góp với 2 nhà</p>
                        <p>{args.multpliedrent[1]} GTTD</p>
                    </li>
                    <li>
                        <p>Đóng góp với 3 nhà</p>
                        <p>{args.multpliedrent[2]} GTTD</p>
                    </li>
                    <li>
                        <p>Đóng góp với 4 nhà</p>
                        <p>{args.multpliedrent[3]} GTTD</p>
                    </li>
                    <li>
                        <p>Đóng góp với khách sạn</p>
                        <p>{args.multpliedrent[4]} GTTD</p>
                    </li>
                </ol>
                <hr />
                <ol>
                    <li>
                        <p>Giá xây dựng</p>
                        <p>{args.housesCost} GTTD /cái</p>
                    </li>
                    <li>
                        <p>Giá nâng cấp</p>
                        <label>
                            {args.hotelsCost} GTTD /cái
                            <br />
                            <p style={{ fontSize: 12 }}>(cộng 4 nhà)</p>
                        </label>
                    </li>
                </ol>

                <br />
                <hr />
                <h4>{args.cardCost} GTTD</h4>
            </div>
        </div>
    );
}

function RailroadCard({ args }: { args: RailroadDisplayInfo }) {
    return (
        <div className="street-card">
            <div data-clear>
                <img
                    data-type="rail"
                    src={RailIcon.replace("/public", "")}
                    alt=""
                />
                <h3>{args.title}</h3>
            </div>
            <div>
                <ol>
                    <li>
                        <p>Đóng góp</p>
                        <p>{25} GTTD</p>
                    </li>
                    <li>
                        <p>Nếu sở hữu 2 nhà ga</p>
                        <p>{50} GTTD</p>
                    </li>
                    <li>
                        <p>Nếu sở hữu 3 nhà ga</p>
                        <p>{100} GTTD</p>
                    </li>
                    <li>
                        <p>Nếu sở hữu 4 nhà ga</p>
                        <p>{200} GTTD</p>
                    </li>
                </ol>
                <h4>Giá trị thế chấp 100 GTTD</h4>
                <hr />
                <br />
                <h4>{args.cardCost} GTTD</h4>
            </div>
        </div>
    );
}

function UtilityCard({ args }: { args: UtilitiesDisplayInfo }) {
    return (
        <div className="street-card">
            <div data-clear>
                <center>
                    <img
                        data-type={args.type}
                        src={
                            args.type === "electricity"
                                ? ElectricityIcon.replace("/public", "")
                                : WaterIcon.replace("/public", "")
                        }
                        alt=""
                    />
                </center>
                <h3>{args.title}</h3>
            </div>
            <div>
                <p style={{ lineHeight: 1, paddingInline: 10 }}>
                    Nếu sở hữu 1 Công ty, đóng góp gấp 4 lần số xúc xắc.
                    <br />
                    <br />
                    Nếu sở hữu cả 2 Công ty, đóng góp gấp 10 lần số xúc xắc.
                </p>
                <hr />
                <br />
                <h4>{args.cardCost} GTTD</h4>
            </div>
        </div>
    );
}
