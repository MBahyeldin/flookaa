TODO:

1- lazy load replies
2- avoid using lookups at all 
3- use virtual scrolling for posts
4- make LXC for Rust(Wrapper) With nginx to avoid (src IP, src port) exhaustion
5- create LXC-LB with HAProxy to hand over ws to different rust containers and others to normal openresty container.
6- USE TIMESTAMPTZ for time
7- eleting a post doesn't remove notifications about replies or likes on that post's comments. The resolver doesn't delete those comments either, so they follow what happens to the comments.