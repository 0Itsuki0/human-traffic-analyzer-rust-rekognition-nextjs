import { createContext, Dispatch, SetStateAction } from "react";
import { v4 as uuidv4 } from 'uuid';

export type USERCONTEXT = {
    userId: string| null
    dispatch: Dispatch<string>
}
export const UserContext = createContext<USERCONTEXT>({
    userId: null,
    dispatch: () => {}
});


export class UserService {
    storageKey = "itsukiAnalyzerUserId"

    getUserId(): string {
        const value = localStorage.getItem(this.storageKey)
        if (!value) {
            let uuid = uuidv4()
            localStorage.setItem(this.storageKey, uuid)
            return uuid
        } else {
            return value
        }
    }
}
