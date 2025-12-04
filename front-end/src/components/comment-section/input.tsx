import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { useCreateCommentMutation, type SimpleInput } from "@/generated/graphql";
import { useAuth } from "@/Auth.context";
import SimpleInputComponent from "../simple-input";
import { useAppStore } from "@/stores/AppStore";

export default function CommentInput({
    parentId,
    level,
}: {
    parentId: string;
    level: number;
}) {
    const { user } = useAuth();
    const owner = useAppStore((state) => state.owner);

    const [CreateComment] = useCreateCommentMutation();

    const handleSend = async (content: SimpleInput) => {
        if (!user?.id || !parentId || !owner) return;

        await CreateComment({
            variables: {
                level,
                parentId,
                authorId: user.id,
                content: content,
                tags: [],
                owner,
                privacy: "PUBLIC",
                allowedUserIds: [],
                deniedUserIds: [],
            },
        });

    };




    return (
        <div className="flex space-x-3 items-start">
            <Avatar className="h-9 w-9">
                <AvatarImage src={user?.thumbnail || ""} />
                <AvatarFallback>{user?.name?.[0] || "U"}</AvatarFallback>
            </Avatar>

            <SimpleInputComponent onSend={handleSend} />
        </div >
    );
}
