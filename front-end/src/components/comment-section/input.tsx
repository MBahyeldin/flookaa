import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { useCreateCommentMutation, type SimpleInput } from "@/generated/graphql";
import SimpleInputComponent from "../simple-input";
import { useAppStore } from "@/stores/AppStore";
import { useUserProfileStore } from "@/stores/UserProfileStore";

export default function CommentInput({
    parentId,
    level,
}: {
    parentId: string;
    level: number;
}) {
    const { persona } = useUserProfileStore();
    const owner = useAppStore((state) => state.owner);

    const [CreateComment] = useCreateCommentMutation();

    const handleSend = async (content: SimpleInput) => {
        if (!persona?.id || !parentId || !owner) return;

        await CreateComment({
            variables: {
                level,
                parentId,
                authorId: persona.id,
                content: content,
                tags: [],
                owner,
                privacy: "PUBLIC",
                allowedPersonaIds: [],
                deniedPersonaIds: [],
            },
        });

    };




    return (
        // The avatar is handed to SimpleInputComponent so it can render inside
        // the composer card, matching how comment items carry their avatar
        // inside the bubble. Persona lookup stays here; layout stays there.
        <div className="min-w-0">
            <SimpleInputComponent
                onSend={handleSend}
                avatar={
                    <Avatar className="h-7 w-7 sm:h-8 sm:w-8 shrink-0">
                        <AvatarImage src={persona?.thumbnail || ""} />
                        <AvatarFallback>{persona?.name?.[0] || "U"}</AvatarFallback>
                    </Avatar>
                }
            />
        </div>
    );
}
