import { useState } from "react";
import { User, botInitial, randomName } from "../../assets/types";
import BotsList from "./botsList";
export default function JoinScreen(props: {
    joinViaCode: () => void;
    joinBots: (x: Array<botInitial>) => void;
    fbUser: User | undefined;
    disabled: boolean;
    name: string;
    addr: string;
    SetAddress: React.Dispatch<React.SetStateAction<string>>;
    SetName: React.Dispatch<React.SetStateAction<string>>;
}) {
    const [tabIndex, SetTab] = useState(0);
    const [botsList, SetBotList] = useState<Array<botInitial>>([
        {
            name: randomName(),
            diff: "Regular",
        },
    ]);
    return (
        <>
            <nav className="join">
                <button
                    data-tooltip-hover={"trực tuyến"}
                    data-select={tabIndex === 0}
                    onClick={() => {
                        SetTab(0);
                    }}
                >
                    <img src="icon_online.svg" alt="" />
                </button>
                <button
                    data-tooltip-hover={"máy"}
                    data-select={tabIndex === 1}
                    onClick={() => {
                        SetTab(1);
                    }}
                >
                    <img src="icon_bot.svg" alt="" />
                </button>
            </nav>
            <br></br>

            {tabIndex === 1 ? (
                <>
                    <div key={"bots-name"}>
                        <p>Vui lòng nhập tên của bạn:</p>
                        {props.fbUser === undefined ? (
                            <input
                                type="text"
                                id="name"
                                onChange={(e) => {
                                    props.SetName(e.currentTarget.value);
                                }}
                                defaultValue={props.name}
                                placeholder="nhập tên"
                            />
                        ) : (
                            <input type="text" id="name" disabled={true} value={props.fbUser.name} placeholder="nhập tên" />
                        )}
                    </div>
                    <p>Cài đặt máy:</p>
                    <BotsList
                        OnChange={(arr: botInitial[]) => {
                            SetBotList(arr);
                        }}
                    />

                    <center>
                        <button
                            onClick={() => {
                                props.joinBots(botsList);
                            }}
                            disabled={props.disabled}
                        >
                            Bắt đầu
                        </button>
                    </center>
                </>
            ) : (
                <>
                    <div key={"online-code"}>
                        <p>Vui lòng nhập mã phòng:</p>
                        <input
                            type="text"
                            id="name"
                            onChange={(e) => props.SetAddress(e.currentTarget.value)}
                            defaultValue={props.addr}
                            placeholder="nhập mã"
                        />
                    </div>

                    <div key={"online-name"}>
                        <p>Vui lòng nhập tên của bạn:</p>
                        {props.fbUser === undefined ? (
                            <input
                                type="text"
                                id="name"
                                onChange={(e) => {
                                    props.SetName(e.currentTarget.value);
                                }}
                                defaultValue={props.name}
                                placeholder="nhập tên"
                            />
                        ) : (
                            <input type="text" id="name" disabled={true} value={props.name} placeholder="nhập tên" />
                        )}
                    </div>

                    <center>
                        <button
                            onClick={() => {
                                props.joinViaCode();
                            }}
                            disabled={props.disabled}
                        >
                            Tham gia
                        </button>
                    </center>
                </>
            )}
        </>
    );
}
