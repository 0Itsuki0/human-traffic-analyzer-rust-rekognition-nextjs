'use client'
import { UserContext, UserService } from "../lib/UserService";
import React from "react";
import {NextUIProvider} from "@nextui-org/react";

const userService = new UserService()

export function Providers({ children }: { children: React.ReactNode }) {
    const [userId, setUserId] = React.useState<string|null>(null);

    React.useEffect(() => {
        const userId = userService.getUserId()
        setUserId(userId)
    }, []);

    const value = React.useMemo(() => (
        {userId: userId, dispatch: setUserId}
    ), [userId, setUserId])

    return (
        <>
        {(userId === null) ?
            <></> :
            <UserContext.Provider value={value}>
                <NextUIProvider>
                    {children}
                </NextUIProvider>
            </UserContext.Provider>
        }
        </>
    );
}