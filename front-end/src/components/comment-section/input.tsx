import { Avatar, AvatarImage } from "../ui/avatar";
import { GeneratedAvatarFallback } from "@/components/generated-avatar";
import { useCreateCommentMutation, type SimpleInput } from "@/generated/graphql";
import SimpleInputComponent from "../simple-input";
import { useAppStore } from "@/stores/AppStore";
import { useUserProfileStore } from "@/stores/UserProfileStore";

export default function CommentInput({
    parentId,
    level,
    autoFocus = false,
    onSent,
}: {
    parentId: string;
    level: number;
    autoFocus?: boolean;
    onSent?: () => void;
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
        onSent?.();
    };

    return (
        <SimpleInputComponent
            onSend={handleSend}
            autoFocus={autoFocus}
            placeholder={level > 1 ? "Write a reply…" : "Write a comment…"}
            avatar={
                <Avatar className="size-7 shrink-0">
                    <AvatarImage src={persona?.thumbnail || ""} />
                    <GeneratedAvatarFallback name={persona ? `${persona.first_name} ${persona.last_name}`.trim() : ""} />
                </Avatar>
            }
        />
    );
}
